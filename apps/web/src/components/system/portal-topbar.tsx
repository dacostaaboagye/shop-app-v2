"use client";

import { Bell, Menu, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { getActiveItem, getShellNotifications } from "./portal-shell-config";

type AppTopbarProps = {
  onAccountOpen: () => void;
  onMenuOpen: () => void;
  onNotificationsOpen: () => void;
  pathname: string;
};

export function AppTopbar({
  onAccountOpen,
  onMenuOpen,
  onNotificationsOpen,
  pathname,
}: AppTopbarProps) {
  const user = useAuthSessionStore((state) => state.user);
  const activeItem = getActiveItem(pathname);
  const notificationCount = getShellNotifications().length;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={onMenuOpen}
            className="lg:hidden"
          >
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium">
              {activeItem?.label ?? "Dashboard"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="relative"
            onClick={onNotificationsOpen}
          >
            <Bell className="size-4" />
            {notificationCount ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                {notificationCount}
              </span>
            ) : null}
            <span className="sr-only">Open notifications</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAccountOpen}
          >
            <UserCircle2 className="size-3.5" />
            <span className="hidden sm:inline">
              {user ? `${user.firstName} ${user.lastName}` : "Account"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
