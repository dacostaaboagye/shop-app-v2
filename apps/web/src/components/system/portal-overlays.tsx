"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
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
import { logout } from "@/lib/auth/auth-client";
import {
  formatNotificationTimeLabel,
  getNotificationActorLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/notification-presentation";
import { getNotificationCenterHref } from "@/lib/notifications/notification-route";
import { authQueryKey } from "@/lib/react-query/auth";
import {
  fetchNotifications,
  notificationsQueryKeyPrefix,
  notificationsQueryKey,
  patchAllNotificationsRead,
  patchNotificationRead,
} from "@/lib/react-query/notifications";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppErrorBanner } from "./app-error";
import { getShellConfig } from "./portal-shell-config";

type AppDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

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
  const unreadItems = notifications.filter((notification) => notification.status === "unread");
  const readItems = notifications.filter((notification) => notification.status === "read");

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
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`notification-skeleton-${index}`}
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
                  <NotificationCard
                    key={notification.notificationKey}
                    notification={notification}
                    pending={markReadMutation.variables === notification.notificationKey && markReadMutation.isPending}
                    onMarkRead={() =>
                      void markReadMutation.mutateAsync(notification.notificationKey)
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
                    <NotificationCard
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

export function AppAccountDialog({ onOpenChange, open }: AppDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: authQueryKey });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Access is permission-scoped. Pages appear in the sidebar based on
            your assigned roles and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/35 p-4">
            <p className="text-sm font-medium">
              {user ? `${user.firstName} ${user.lastName}` : "Signed out"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.email ?? "No active session"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{user?.status ?? "anonymous"}</Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void logoutMutation.mutateAsync()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            Sign out
            <LogOut data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
  pending = false,
}: {
  notification: Awaited<ReturnType<typeof fetchNotifications>>["items"][number];
  onMarkRead?: () => void;
  pending?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/35 p-4 ${
        notification.status === "read" ? "opacity-75" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{notification.summary}</p>
        <Badge variant="outline">
          {getNotificationEventLabel(notification.eventType)}
        </Badge>
        <Badge variant="outline">
          {formatNotificationTimeLabel(notification.occurredAt)}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{getNotificationActorLabel(notification)}</span>
        <span>&bull;</span>
        <span>{notification.resource.reference}</span>
      </div>
      {notification.status === "unread" && onMarkRead ? (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onMarkRead}
            disabled={pending}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Mark read
          </Button>
        </div>
      ) : null}
    </div>
  );
}
