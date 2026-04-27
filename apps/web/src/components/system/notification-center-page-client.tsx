"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { NotificationCenterFilters } from "@/components/system/notification-center-filters";
import {
  buildNotificationEventOptions,
  buildNotificationResourceOptions,
  filterNotifications,
  hasActiveNotificationFilters,
  type NotificationFilters,
} from "@/components/system/notification-center-page-client.support";
import { NotificationFeedCard } from "@/components/system/notification-feed-card";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
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
import {
  deleteNotification,
  fetchNotifications,
  notificationsQueryKey,
  notificationsQueryKeyPrefix,
  patchAllNotificationsRead,
  patchNotificationRead,
} from "@/lib/react-query/notifications";

type NotificationCenterPageClientProps = {
  description: string;
  headerActionsExtra?: ReactNode;
  secondaryTabContent?: ReactNode;
  secondaryTabLabel?: string;
  title: string;
};

const PAGE_LIMIT = 50;
const NOTIFICATION_PAGE_SKELETON_KEYS = [
  "notification-page-skeleton-1",
  "notification-page-skeleton-2",
  "notification-page-skeleton-3",
  "notification-page-skeleton-4",
  "notification-page-skeleton-5",
  "notification-page-skeleton-6",
] as const;

export function NotificationCenterPageClient({
  description,
  headerActionsExtra,
  secondaryTabContent,
  secondaryTabLabel = "Sent",
  title,
}: NotificationCenterPageClientProps) {
  const [filters, setFilters] = useState<NotificationFilters>({
    dateRange: undefined,
    eventType: "",
    resourceKind: "",
    search: "",
    status: "all",
  });
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryFn: () => fetchNotifications(PAGE_LIMIT),
    queryKey: notificationsQueryKey(PAGE_LIMIT),
  });
  const markReadMutation = useMutation({
    mutationFn: patchNotificationRead,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });
  const markAllReadMutation = useMutation({
    mutationFn: patchAllNotificationsRead,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const readCount = Math.max(items.length - unreadCount, 0);
  const eventOptions = useMemo(
    () => buildNotificationEventOptions(items),
    [items],
  );
  const resourceOptions = useMemo(
    () => buildNotificationResourceOptions(items),
    [items],
  );
  const hasActiveFilters = useMemo(
    () => hasActiveNotificationFilters(filters),
    [filters],
  );
  const filteredItems = useMemo(() => {
    return filterNotifications(items, filters);
  }, [filters, items]);

  const inboxContent = (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Items still waiting for acknowledgement."
          icon={Bell}
          label="Unread"
          value={unreadCount}
        />
        <StatCard
          description="Items already acknowledged in this feed."
          icon={Inbox}
          label="Read"
          value={readCount}
        />
        <StatCard
          description="Recent platform events currently loaded in this workspace."
          icon={Bell}
          label="In Feed"
          value={items.length}
        />
      </section>

      <NotificationCenterFilters
        eventOptions={eventOptions}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onClear={() =>
          setFilters({
            dateRange: undefined,
            eventType: "",
            resourceKind: "",
            search: "",
            status: "all",
          })
        }
        onDateRangeChange={(dateRange) =>
          setFilters((current) => ({ ...current, dateRange }))
        }
        onEventTypeChange={(eventType) =>
          setFilters((current) => ({
            ...current,
            eventType: eventType === "__all__" ? "" : eventType,
          }))
        }
        onResourceKindChange={(resourceKind) =>
          setFilters((current) => ({
            ...current,
            resourceKind: resourceKind === "__all__" ? "" : resourceKind,
          }))
        }
        onSearchChange={(search) =>
          setFilters((current) => ({ ...current, search }))
        }
        onStatusChange={(status) =>
          setFilters((current) => ({ ...current, status }))
        }
        resourceOptions={resourceOptions}
      />

      {notificationsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          {NOTIFICATION_PAGE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : notificationsQuery.isError ? (
        <AppErrorBanner
          error={notificationsQuery.error}
          onRetry={() => void notificationsQuery.refetch()}
          title="Notifications could not be loaded"
        />
      ) : filteredItems.length ? (
        <div className="flex flex-col gap-3">
          {markReadMutation.isError ||
          markAllReadMutation.isError ||
          deleteMutation.isError ? (
            <AppErrorBanner
              error={
                markReadMutation.error ??
                markAllReadMutation.error ??
                deleteMutation.error
              }
              title="Notification state could not be updated"
            />
          ) : null}
          {filteredItems.map((notification, index) => (
            <div key={notification.notificationKey}>
              <NotificationFeedCard
                deletePending={
                  deleteMutation.variables === notification.notificationKey &&
                  deleteMutation.isPending
                }
                notification={notification}
                pending={
                  markReadMutation.variables === notification.notificationKey &&
                  markReadMutation.isPending
                }
                showStatus
                variant="page"
                onDelete={() => {
                  void deleteMutation.mutateAsync(notification.notificationKey);
                }}
                {...(notification.status === "unread"
                  ? {
                      onMarkRead: () => {
                        void markReadMutation.mutateAsync(
                          notification.notificationKey,
                        );
                      },
                    }
                  : {})}
              />
              {index < filteredItems.length - 1 ? <Separator /> : null}
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
              {hasActiveFilters
                ? "Adjust the current filters to widen the results in this feed."
                : "Operational updates will appear here as new platform events arrive."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:min-w-[32rem] xl:grid-cols-[auto_auto_auto] xl:justify-end">
            {headerActionsExtra ? (
              <div className="sm:col-span-2 xl:col-span-1">
                {headerActionsExtra}
              </div>
            ) : null}
            <Button
              className="w-full xl:w-auto"
              type="button"
              variant="outline"
              onClick={() => void markAllReadMutation.mutateAsync()}
              disabled={!unreadCount || markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckCheck data-icon="inline-start" />
              )}
              Mark All Read
            </Button>
            <Button
              className="w-full xl:w-auto"
              type="button"
              variant="outline"
              onClick={() => void notificationsQuery.refetch()}
              disabled={notificationsQuery.isFetching}
            >
              {notificationsQuery.isFetching ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Refresh
            </Button>
          </div>
        }
        description={description}
        title={title}
      />
      {secondaryTabContent ? (
        <Tabs className="gap-4" defaultValue="inbox">
          <TabsList className="w-fit" variant="default">
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="sent">{secondaryTabLabel}</TabsTrigger>
          </TabsList>
          <TabsContent className="flex flex-col gap-4" value="inbox">
            {inboxContent}
          </TabsContent>
          <TabsContent className="flex flex-col gap-4" value="sent">
            {secondaryTabContent}
          </TabsContent>
        </Tabs>
      ) : (
        inboxContent
      )}
    </PageShell>
  );
}
