"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Menu, UserCircle2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getPermissionLocationScopes } from "@/lib/authorization/location-scopes";
import {
  fetchNotifications,
  notificationsQueryKey,
} from "@/lib/react-query/notifications";
import { toRoute } from "@/lib/routes";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { getActiveItem } from "./portal-shell-config";

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
  const locationSelector = useTopbarLocationSelector(
    activeItem?.requiredPermission ?? null,
  );
  const notificationsQuery = useQuery({
    enabled: !!user,
    queryFn: () => fetchNotifications(12),
    queryKey: notificationsQueryKey(12),
  });
  const notificationCount = notificationsQuery.data?.unreadCount ?? 0;

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
          <TopbarLocationSelector {...locationSelector} />
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
                {notificationCount > 9 ? "9+" : notificationCount}
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
      <div className="hidden max-w-52 truncate rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:block">
        Acting at{" "}
        <span className="font-medium text-foreground">
          {scopes[0]?.locationName}
        </span>
      </div>
    );
  }

  return (
    <div className="hidden min-w-44 max-w-56 md:block">
      <Select
        aria-label="Select acting location"
        className="h-9 bg-card text-xs"
        onChange={(event) => onLocationChange(event.target.value)}
        value={selectedLocationSlug}
      >
        {scopes.map((scope) => (
          <option key={scope.locationId} value={scope.locationSlug}>
            {scope.locationName}
          </option>
        ))}
      </Select>
    </div>
  );
}

function useTopbarLocationSelector(permission: string | null) {
  const currentPathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locationScopes } = useAuthorization();
  const scopes = useMemo(
    () =>
      permission ? getPermissionLocationScopes(locationScopes, permission) : [],
    [locationScopes, permission],
  );
  const selectedLocationSlug =
    searchParams.get("location")?.trim() || scopes[0]?.locationSlug || "";

  function onLocationChange(locationSlug: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (locationSlug) {
      nextParams.set("location", locationSlug);
    } else {
      nextParams.delete("location");
    }

    const query = nextParams.toString();
    router.replace(
      toRoute(query ? `${currentPathname}?${query}` : currentPathname),
      {
        scroll: false,
      },
    );
  }

  return { onLocationChange, scopes, selectedLocationSlug };
}
