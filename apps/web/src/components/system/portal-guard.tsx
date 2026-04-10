"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  currentUserPermissionsQueryKey,
  fetchCurrentUserPermissions,
} from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { canAccessPortalItem, getRouteItem } from "./portal-shell-config";

type AuthGuardProps = {
  children: ReactNode;
};

/**
 * Permission-only route guard. Checks authentication status and whether
 * the user holds the page-level permission required by the matched
 * NAV_REGISTRY entry. No portal membership check — access is determined
 * solely by the user's permissions.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthSessionStore((s) => s.status);
  const user = useAuthSessionStore((s) => s.user);
  const permissionsQuery = useQuery({
    enabled: status === "authenticated",
    queryFn: fetchCurrentUserPermissions,
    queryKey: currentUserPermissionsQueryKey,
  });
  const permissions = permissionsQuery.data?.permissions ?? [];
  const routeItem = getRouteItem(pathname);
  const hasRouteAccess =
    routeItem === undefined || canAccessPortalItem(routeItem, permissions);

  useEffect(() => {
    if (status === "refreshing") return;

    if (status === "anonymous") {
      router.replace(toRoute("/login"));
      return;
    }

    if (!user) return;

    if (permissionsQuery.isLoading) {
      return;
    }

    if (!hasRouteAccess) {
      router.replace(toRoute("/no-access"));
    }
  }, [hasRouteAccess, permissionsQuery.isLoading, router, status, user]);

  const isReady =
    status === "authenticated" &&
    user !== null &&
    !permissionsQuery.isLoading &&
    hasRouteAccess;

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
