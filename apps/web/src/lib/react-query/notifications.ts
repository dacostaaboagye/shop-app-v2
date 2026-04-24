import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationListResponse,
} from "@shop/contracts";
import type { QueryKey } from "@tanstack/react-query";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const notificationsQueryKeyPrefix = [
  "notifications",
] as const satisfies QueryKey;

export const notificationsQueryKey = (limit = 12) =>
  [
    ...notificationsQueryKeyPrefix,
    "list",
    { limit },
  ] as const satisfies QueryKey;

export async function fetchNotifications(
  limit = 12,
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });

  return fetchJson<NotificationListResponse>(
    `/api/notifications?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function patchNotificationRead(
  notificationKey: string,
): Promise<MarkNotificationReadResponse> {
  return fetchJson<MarkNotificationReadResponse>(
    `/api/notifications/${encodeURIComponent(notificationKey)}/read`,
    { method: "PATCH" },
    { auth: "required" },
  );
}

export async function patchAllNotificationsRead(): Promise<MarkAllNotificationsReadResponse> {
  return fetchJson<MarkAllNotificationsReadResponse>(
    "/api/notifications/read-all",
    { method: "PATCH" },
    { auth: "required" },
  );
}
