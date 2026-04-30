"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorState } from "@/components/system/app-error";
import { buildLoginRedirectHref } from "@/lib/auth/auth-redirect";
import { toRoute } from "@/lib/routes";
import {
  isAuthSessionPending,
  useAuthSessionStore,
} from "@/store/use-auth-session-store";
import { AuthTransitionState } from "./auth-transition-state";
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
  const authorization = useAuthorization();
  const routeItem = getRouteItem(pathname);
  const hasRouteAccess =
    routeItem === undefined ||
    canAccessPortalItem(routeItem, authorization.ability);

  useEffect(() => {
    if (isAuthSessionPending(status)) return;

    if (status === "anonymous") {
      const query =
        typeof window === "undefined" ? "" : window.location.search.slice(1);
      const nextPath = query ? `${pathname}?${query}` : pathname;
      router.replace(buildLoginRedirectHref(nextPath));
      return;
    }

    if (!user) return;

    if (authorization.isLoading || authorization.isError) {
      return;
    }

    if (!hasRouteAccess) {
      router.replace(toRoute("/no-access"));
    }
  }, [
    authorization.isError,
    authorization.isLoading,
    hasRouteAccess,
    router,
    status,
    user,
    pathname,
  ]);

  if (authorization.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <AppErrorState
          className="max-w-xl"
          detail="Permissions could not be loaded for this session."
          error={authorization.error}
          onRetry={() => {
            void authorization.refetch();
          }}
          title="Unable to verify page access"
        />
      </div>
    );
  }

  const isReady =
    status === "authenticated" &&
    user !== null &&
    !authorization.isLoading &&
    hasRouteAccess;

  if (!isReady) {
    return (
      <AuthTransitionState
        description="We are checking your session and workspace permissions."
        title="Loading Access"
      />
    );
  }

  return <>{children}</>;
}
