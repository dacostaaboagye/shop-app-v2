import type { NotificationListItem } from "@shop/contracts";
import { endOfDay, isAfter, isBefore, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  getNotificationEventLabel,
  getNotificationPresentation,
} from "@/lib/notifications/notification-presentation";

export type NotificationStatusFilter = "all" | "read" | "unread";

export type NotificationFilters = {
  dateRange: DateRange | undefined;
  eventType: string;
  resourceKind: string;
  search: string;
  status: NotificationStatusFilter;
};

export type NotificationFilterOption = {
  label: string;
  value: string;
};

export function buildNotificationEventOptions(
  items: NotificationListItem[],
): NotificationFilterOption[] {
  return buildNotificationOptions(
    items,
    (item) => item.eventType,
    (value) => getNotificationEventLabel(value),
  );
}

export function buildNotificationResourceOptions(
  items: NotificationListItem[],
): NotificationFilterOption[] {
  return buildNotificationOptions(
    items,
    (item) => item.resource.kind,
    (value) => toHumanLabel(value),
  );
}

export function filterNotifications(
  items: NotificationListItem[],
  filters: NotificationFilters,
): NotificationListItem[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.eventType && item.eventType !== filters.eventType) {
      return false;
    }

    if (filters.resourceKind && item.resource.kind !== filters.resourceKind) {
      return false;
    }

    if (!matchesDateRange(item.occurredAt, filters.dateRange)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const presentation = getNotificationPresentation(item);
    const haystack = [
      item.actorUserSlug,
      item.eventType,
      item.resource.kind,
      item.resource.reference,
      item.summary,
      presentation.title,
      presentation.detail,
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export function hasActiveNotificationFilters(filters: NotificationFilters) {
  return Boolean(
    filters.search.trim() ||
      filters.status !== "all" ||
      filters.eventType ||
      filters.resourceKind ||
      filters.dateRange?.from ||
      filters.dateRange?.to,
  );
}

function buildNotificationOptions(
  items: NotificationListItem[],
  pickValue: (item: NotificationListItem) => string,
  pickLabel: (value: string) => string,
): NotificationFilterOption[] {
  const values = new Map<string, string>();

  for (const item of items) {
    const value = pickValue(item).trim();
    if (!value || values.has(value)) {
      continue;
    }

    values.set(value, pickLabel(value));
  }

  return [...values.entries()]
    .map(([value, label]) => ({ label, value }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function matchesDateRange(occurredAt: string, dateRange?: DateRange) {
  if (!dateRange?.from) {
    return true;
  }

  const occurredAtDate = new Date(occurredAt);
  const from = startOfDay(dateRange.from);

  if (isBefore(occurredAtDate, from)) {
    return false;
  }

  if (!dateRange.to) {
    return true;
  }

  return !isAfter(occurredAtDate, endOfDay(dateRange.to));
}

function toHumanLabel(value: string) {
  const label = value.replace(/[._-]+/g, " ").trim();
  return label.replace(/\b\w/g, (match) => match.toUpperCase());
}
