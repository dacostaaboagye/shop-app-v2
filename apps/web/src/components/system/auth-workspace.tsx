"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldAlert, ShieldCheck, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthLoginForm } from "@/components/forms/auth-login-form";
import { AuthRegisterForm } from "@/components/forms/auth-register-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/lib/auth/auth-client";
import {
  getAuthErrorMessage,
  isUnauthorizedApiError,
} from "@/lib/auth/auth-messages";
import { getPortalHref, getPortalSelectionState } from "@/lib/portals";
import { currentUserQueryKey, fetchCurrentUser } from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { AppBanner } from "./app-banner";
import {
  type AuthWorkspaceMode,
  anonymousCopy,
  useSafeRouter,
} from "./auth-workspace-router";
import {
  AuthLoadingCard,
  AuthSessionHighlights,
} from "./auth-workspace-support";

type AuthWorkspaceProps = {
  mode?: AuthWorkspaceMode;
};

export function AuthWorkspace({ mode = "login" }: AuthWorkspaceProps) {
  const router = useSafeRouter();
  const queryClient = useQueryClient();
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const { availablePortals, preferredPortal } = getPortalSelectionState(user);

    if (preferredPortal) {
      router.replace(getPortalHref(preferredPortal));
      return;
    }

    if (availablePortals.length === 1) {
      const portal = availablePortals[0];

      if (!portal) {
        router.replace(toRoute("/"));
        return;
      }

      router.replace(getPortalHref(portal));
      return;
    }

    if (availablePortals.length > 1) {
      router.replace(toRoute("/select-portal"));
      return;
    }

    router.replace(toRoute("/"));
  }, [status, user, router]);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
    },
  });
  const currentUserQuery = useQuery({
    enabled: status === "authenticated",
    queryFn: fetchCurrentUser,
    queryKey: currentUserQueryKey,
  });

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticated.current = true;
      setSessionNotice(null);
      return;
    }

    if (
      status === "anonymous" &&
      wasAuthenticated.current &&
      isUnauthorizedApiError(currentUserQuery.error)
    ) {
      wasAuthenticated.current = false;
      setSessionNotice(
        "Your access changed during the last secure check. Sign in again to continue.",
      );
    }
  }, [currentUserQuery.error, status]);

  if (status === "refreshing") {
    return <AuthLoadingCard />;
  }

  if (status === "authenticated" && user) {
    const probeError = currentUserQuery.error
      ? getAuthErrorMessage(currentUserQuery.error)
      : null;

    return (
      <Card className="surface-card">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="eyebrow-block">
              <CardTitle>{`${user.firstName} ${user.lastName}`}</CardTitle>
              <CardDescription>Your account is signed in.</CardDescription>
            </div>
            <div className="token-row">
              <Badge variant="secondary">{user.status}</Badge>
              <Badge variant="outline">{user.email}</Badge>
              {user.preferredPortal ? (
                <Badge variant="outline">{user.preferredPortal}</Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <AuthSessionHighlights user={user} />

          <div className="rounded-lg border border-border/80 bg-muted/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-secondary p-2 text-primary">
                  <UserCircle2 className="size-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Confirm account access</p>
                  <p className="support-copy text-sm">
                    Run a protected check to confirm the account can still
                    continue.
                  </p>
                </div>
              </div>
              <div className="token-row">
                <Button
                  onClick={() => void currentUserQuery.refetch()}
                  type="button"
                  variant="outline"
                >
                  Check status
                </Button>
                <Button
                  disabled={logoutMutation.isPending}
                  onClick={() => void logoutMutation.mutateAsync()}
                  type="button"
                >
                  {logoutMutation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : null}
                  Log out
                  <LogOut data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>

          {currentUserQuery.isPending ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : currentUserQuery.isError && probeError ? (
            <AppBanner
              description={probeError.detail}
              icon={ShieldAlert}
              title={probeError.title}
              tone="warning"
            />
          ) : (
            <AppBanner
              description="The protected account check succeeded. If an administrator deactivates this account, the next protected request ends access immediately."
              icon={ShieldCheck}
              title="Access is active"
              tone="success"
            />
          )}
        </CardContent>
      </Card>
    );
  }

  const content = anonymousCopy[mode];

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-sans text-lg font-semibold">
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {sessionNotice ? (
          <AppBanner
            description={sessionNotice}
            icon={ShieldAlert}
            title="Session ended"
            tone="warning"
          />
        ) : null}

        {mode === "login" ? <AuthLoginForm /> : <AuthRegisterForm />}

        <p className="text-sm text-muted-foreground">
          {content.linkPrompt}{" "}
          <Link
            className={buttonVariants({ size: "sm", variant: "link" })}
            href={content.alternateHref}
          >
            {content.alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
