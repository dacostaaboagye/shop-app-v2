"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getNotificationCenterHref } from "@/lib/notifications/notification-route";
import {
  fetchNotifications,
  notificationsQueryKey,
  notificationsQueryKeyPrefix,
  patchAllNotificationsRead,
  patchNotificationRead,
} from "@/lib/react-query/notifications";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppErrorBanner } from "./app-error";
import { NotificationFeedCard } from "./notification-feed-card";
import { getShellConfig } from "./portal-shell-config";

type AppDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const NOTIFICATION_DIALOG_SKELETON_KEYS = [
  "notification-dialog-skeleton-1",
  "notification-dialog-skeleton-2",
  "notification-dialog-skeleton-3",
  "notification-dialog-skeleton-4",
] as const;

export function AppNotificationsDialog({ onOpenChange, open }: AppDialogProps) {
  const config = getShellConfig();
  const pathname = usePathname();
  const user = useAuthSessionStore((state) => state.user);
  const queryClient = useQueryClient();
  const notificationCenterHref = getNotificationCenterHref(pathname);
  const notificationsQuery = useQuery({
    enabled: !!user,
    queryFn: () => fetchNotifications(12),
    queryKey: notificationsQueryKey(12),
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
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const unreadItems = notifications.filter(
    (notification) => notification.status === "unread",
  );
  const readItems = notifications.filter(
    (notification) => notification.status === "read",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Notifications
            <Badge variant="secondary">{unreadCount} unread</Badge>
          </DialogTitle>
          <DialogDescription>
            Operational changes affecting your work appear here in one running
            feed.
          </DialogDescription>
        </DialogHeader>

        {notificationsQuery.isPending ? (
          <div className="flex flex-col gap-3">
            {NOTIFICATION_DIALOG_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-muted/25 p-4"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-3 h-3.5 w-full" />
                <Skeleton className="mt-2 h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        ) : notificationsQuery.isError ? (
          <AppErrorBanner
            error={notificationsQuery.error}
            onRetry={() => void notificationsQuery.refetch()}
            title="Notifications could not be loaded"
          />
        ) : notifications.length ? (
          <div className="flex max-h-[26rem] flex-col gap-4 overflow-y-auto pr-1">
            {markReadMutation.isError || markAllReadMutation.isError ? (
              <AppErrorBanner
                error={markReadMutation.error ?? markAllReadMutation.error}
                title="Notification state could not be updated"
              />
            ) : null}
            {unreadItems.length ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Needs attention</p>
                  {unreadCount ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void markAllReadMutation.mutateAsync()}
                      disabled={markAllReadMutation.isPending}
                    >
                      {markAllReadMutation.isPending ? (
                        <Spinner data-icon="inline-start" />
                      ) : null}
                      Mark all read
                    </Button>
                  ) : null}
                </div>
                {unreadItems.map((notification) => (
                  <NotificationFeedCard
                    key={notification.notificationKey}
                    notification={notification}
                    pending={
                      markReadMutation.variables ===
                        notification.notificationKey &&
                      markReadMutation.isPending
                    }
                    onMarkRead={() =>
                      void markReadMutation.mutateAsync(
                        notification.notificationKey,
                      )
                    }
                  />
                ))}
              </div>
            ) : null}
            {readItems.length ? (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Earlier
                  </p>
                  {readItems.map((notification) => (
                    <NotificationFeedCard
                      key={notification.notificationKey}
                      notification={notification}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <Empty className="border-border bg-muted/25">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell className="size-4" />
              </EmptyMedia>
              <EmptyTitle>No notifications yet</EmptyTitle>
              <EmptyDescription>
                {config.emptyNotificationCopy}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <DialogFooter showCloseButton>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={notificationCenterHref}
            onClick={() => onOpenChange(false)}
          >
            View all notifications
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
