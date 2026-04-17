"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/lib/auth/auth-client";
import { authQueryKey } from "@/lib/react-query/auth";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { getShellConfig, getShellNotifications } from "./portal-shell-config";

type AppDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function AppNotificationsDialog({ onOpenChange, open }: AppDialogProps) {
  const config = getShellConfig();
  const notifications = getShellNotifications();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Role-relevant events stay grouped in one tray across the
            application.
          </DialogDescription>
        </DialogHeader>

        {notifications.length ? (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border border-border bg-muted/35 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <Badge variant="outline">{notification.timeLabel}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {notification.body}
                </p>
              </div>
            ))}
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

        <DialogFooter showCloseButton />
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
