"use client";

import type { NotificationListItem } from "@shop/contracts";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";
import { NotificationCenterFilters } from "@/components/system/notification-center-filters";
import type {
  NotificationFilterOption,
  NotificationFilters,
} from "@/components/system/notification-center-page-client.support";
import { NotificationFeedCard } from "@/components/system/notification-feed-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppErrorBanner } from "./app-error";
import { PageHeader, StatCard } from "./page-shell";

const NOTIFICATION_PAGE_SKELETON_KEYS = [
  "notification-page-skeleton-1",
  "notification-page-skeleton-2",
  "notification-page-skeleton-3",
  "notification-page-skeleton-4",
  "notification-page-skeleton-5",
  "notification-page-skeleton-6",
] as const;

export function NotificationCenterHeader(props: {
  description: string;
  headerActionsExtra?: ReactNode;
  isFetching: boolean;
  isMarkingAllRead: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  title: string;
  unreadCount: number;
}) {
  return (
    <PageHeader
      actions={
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:min-w-[32rem] xl:grid-cols-[auto_auto_auto] xl:justify-end">
          {props.headerActionsExtra ? (
            <div className="sm:col-span-2 xl:col-span-1">
              {props.headerActionsExtra}
            </div>
          ) : null}
          <Button
            className="w-full xl:w-auto"
            type="button"
            variant="outline"
            onClick={props.onMarkAllRead}
            disabled={!props.unreadCount || props.isMarkingAllRead}
          >
            {props.isMarkingAllRead ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            Mark All Read
          </Button>
          <Button
            className="w-full xl:w-auto"
            type="button"
            variant="outline"
            onClick={props.onRefresh}
            disabled={props.isFetching}
          >
            {props.isFetching ? <Spinner data-icon="inline-start" /> : null}
            Refresh
          </Button>
        </div>
      }
      description={props.description}
      title={props.title}
    />
  );
}

export function NotificationInboxSection(props: {
  deleteError: unknown;
  deletePendingKey?: string | undefined;
  error: unknown;
  eventOptions: NotificationFilterOption[];
  filteredItems: NotificationListItem[];
  filters: NotificationFilters;
  hasActiveFilters: boolean;
  isDeleting: boolean;
  isError: boolean;
  isMarkAllReadError: boolean;
  isMarkReadError: boolean;
  isPending: boolean;
  itemsCount: number;
  markReadError: unknown;
  markReadPendingKey?: string | undefined;
  onClearFilters: () => void;
  onDateRangeChange: (value: NotificationFilters["dateRange"]) => void;
  onDelete: (key: string) => void;
  onEventTypeChange: (value: string) => void;
  onMarkRead: (key: string) => void;
  onResourceKindChange: (value: string) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: NotificationFilters["status"]) => void;
  readCount: number;
  resourceOptions: NotificationFilterOption[];
  unreadCount: number;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Items still waiting for acknowledgement."
          icon={Bell}
          label="Unread"
          value={props.unreadCount}
        />
        <StatCard
          description="Items already acknowledged in this feed."
          icon={Bell}
          label="Read"
          value={props.readCount}
        />
        <StatCard
          description="Recent platform events currently loaded in this workspace."
          icon={Bell}
          label="In Feed"
          value={props.itemsCount}
        />
      </section>

      <NotificationCenterFilters
        eventOptions={props.eventOptions}
        filters={props.filters}
        hasActiveFilters={props.hasActiveFilters}
        onClear={props.onClearFilters}
        onDateRangeChange={props.onDateRangeChange}
        onEventTypeChange={props.onEventTypeChange}
        onResourceKindChange={props.onResourceKindChange}
        onSearchChange={props.onSearchChange}
        onStatusChange={props.onStatusChange}
        resourceOptions={props.resourceOptions}
      />

      {props.isPending ? (
        <div className="flex flex-col gap-3">
          {NOTIFICATION_PAGE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : props.isError ? (
        <AppErrorBanner
          error={props.error}
          onRetry={props.onRetry}
          title="Notifications could not be loaded"
        />
      ) : props.filteredItems.length ? (
        <div className="flex flex-col gap-3">
          {props.isMarkReadError ||
          props.isMarkAllReadError ||
          props.isDeleting ? (
            <AppErrorBanner
              error={props.markReadError ?? props.deleteError ?? props.error}
              title="Notification state could not be updated"
            />
          ) : null}
          {props.filteredItems.map((notification, index) => (
            <div key={notification.notificationKey}>
              <NotificationFeedCard
                deletePending={
                  props.deletePendingKey === notification.notificationKey
                }
                notification={notification}
                pending={
                  props.markReadPendingKey === notification.notificationKey
                }
                showStatus
                variant="page"
                onDelete={() => props.onDelete(notification.notificationKey)}
                {...(notification.status === "unread"
                  ? {
                      onMarkRead: () =>
                        props.onMarkRead(notification.notificationKey),
                    }
                  : {})}
              />
              {index < props.filteredItems.length - 1 ? <Separator /> : null}
            </div>
          ))}
        </div>
      ) : (
        <Empty className="border-border bg-muted/25">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell className="size-4" />
            </EmptyMedia>
            <EmptyTitle>No matching notifications</EmptyTitle>
            <EmptyDescription>
              {props.hasActiveFilters
                ? "Adjust the current filters to widen the results in this feed."
                : "Operational updates will appear here as new platform events arrive."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}

export function NotificationCenterTabs(props: {
  inboxContent: ReactNode;
  secondaryTabContent: ReactNode;
  secondaryTabLabel: string;
}) {
  return (
    <Tabs className="gap-4" defaultValue="inbox">
      <TabsList className="w-fit" variant="default">
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="sent">{props.secondaryTabLabel}</TabsTrigger>
      </TabsList>
      <TabsContent className="flex flex-col gap-4" value="inbox">
        {props.inboxContent}
      </TabsContent>
      <TabsContent className="flex flex-col gap-4" value="sent">
        {props.secondaryTabContent}
      </TabsContent>
    </Tabs>
  );
}
