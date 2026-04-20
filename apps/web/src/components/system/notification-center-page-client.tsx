"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
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
  fetchNotifications,
  notificationsQueryKey,
  notificationsQueryKeyPrefix,
  patchAllNotificationsRead,
  patchNotificationRead,
} from "@/lib/react-query/notifications";

type NotificationCenterPageClientProps = {
  description: string;
  title: string;
};

type NotificationFilter = "all" | "read" | "unread";

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
  title,
}: NotificationCenterPageClientProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
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

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const readCount = Math.max(items.length - unreadCount, 0);
  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => item.status === "unread");
    }

    if (filter === "read") {
      return items.filter((item) => item.status === "read");
    }

    return items;
  }, [filter, items]);

  return (
    <PageShell>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
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
            <Button
              type="button"
              onClick={() => void markAllReadMutation.mutateAsync()}
              disabled={!unreadCount || markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckCheck data-icon="inline-start" />
              )}
              Mark all read
            </Button>
          </div>
        }
        description={description}
        title={title}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          description="Items still awaiting acknowledgement."
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
          description="Recent platform events currently retained in the UI feed."
          icon={Bell}
          label="Loaded"
          value={items.length}
        />
      </section>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as NotificationFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
        <TabsContent value={filter}>
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
              {markReadMutation.isError || markAllReadMutation.isError ? (
                <AppErrorBanner
                  error={markReadMutation.error ?? markAllReadMutation.error}
                  title="Notification state could not be updated"
                />
              ) : null}
              {filteredItems.map((notification, index) => (
                <div key={notification.notificationKey}>
                  <NotificationFeedCard
                    notification={notification}
                    pending={
                      markReadMutation.variables ===
                        notification.notificationKey &&
                      markReadMutation.isPending
                    }
                    showStatus
                    variant="page"
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
                  {filter === "unread"
                    ? "Everything in the current feed has already been acknowledged."
                    : filter === "read"
                      ? "Read notifications will appear here after you acknowledge updates."
                      : "Operational updates will appear here as platform events are delivered."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
