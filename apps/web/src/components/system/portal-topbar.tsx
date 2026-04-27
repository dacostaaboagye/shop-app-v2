"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
import {
  fetchNotifications,
  notificationsQueryKey,
} from "@/lib/react-query/notifications";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { getPortalAccountHref } from "./portal-account-routes";
import { getActiveItem } from "./portal-shell-config";

type AppTopbarProps = {
  onMenuOpen: () => void;
  onNotificationsOpen: () => void;
  pathname: string;
};

export function AppTopbar({
  onMenuOpen,
  onNotificationsOpen,
  pathname,
}: AppTopbarProps) {
  const user = useAuthSessionStore((state) => state.user);
  const accountHref = getPortalAccountHref({ pathname, user });
  const activeItem = getActiveItem(pathname);
  const locationSelector = useTopbarLocationSelector(
    activeItem?.locationSelectorPermission === undefined
      ? (activeItem?.requiredPermission ?? null)
      : activeItem.locationSelectorPermission,
  );
  const notificationsQuery = useQuery({
    enabled: !!user,
    queryFn: () => fetchNotifications(12),
    queryKey: notificationsQueryKey(12),
  });
  const notificationCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-transparent transition-all">
      <div className="mx-auto flex min-h-16 w-full max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onMenuOpen}
            className="lg:hidden rounded-lg text-foreground hover:bg-muted/50"
          >
            <Menu className="size-4" />
            <span className="sr-only">Open navigation</span>
          </Button>

          {/* Title removed to avoid redundancy with PageHeader */}
        </div>

        <div className="flex items-center gap-2">
          <TopbarLocationSelector {...locationSelector} />

          <div className="flex items-center gap-1.5 rounded-xl bg-muted/30 p-1 ring-1 ring-border/50">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="relative rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onNotificationsOpen}
            >
              <Bell className="size-4" />
              {notificationCount ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground ring-2 ring-muted">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
              <span className="sr-only">Open notifications</span>
            </Button>

            <Link
              href={accountHref}
              scroll={false}
              className={buttonVariants({
                className:
                  "rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground gap-2",
                size: "sm",
                variant: "ghost",
              })}
            >
              <PersonAvatar
                firstName={user?.firstName}
                imageUrl={user?.primaryImageUrl}
                interactive={false}
                lastName={user?.lastName}
                size="sm"
              />
              <span className="hidden sm:inline">
                {user ? `${user.firstName} ${user.lastName}` : "Account"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function TopbarLocationSelector({
  onLocationChange,
  scopes,
  selectedLocationSlug,
}: {
  onLocationChange: (locationSlug: string) => void;
  scopes: ReturnType<typeof useTopbarLocationSelector>["scopes"];
  selectedLocationSlug: string;
}) {
  if (scopes.length === 0) return null;

  if (scopes.length === 1) {
    return (
      <div className="hidden max-w-64 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground md:block">
        Acting at{" "}
        <span className="font-medium text-foreground">
          {scopes[0]?.locationName}
        </span>
      </div>
    );
  }

  return (
    <div className="hidden min-w-0 max-w-64 md:block md:w-64">
      <Select onValueChange={onLocationChange} value={selectedLocationSlug}>
        <SelectTrigger className="h-9 bg-muted/30 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scopes.map((scope) => (
            <SelectItem key={scope.locationId} value={scope.locationSlug}>
              {scope.locationName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function useTopbarLocationSelector(permission: string | null) {
  const {
    accessibleLocationScopes: scopes,
    selectedLocationSlug,
    setSelectedLocationSlug: onLocationChange,
  } = useActiveLocationScope(permission);

  return { onLocationChange, scopes, selectedLocationSlug };
}
