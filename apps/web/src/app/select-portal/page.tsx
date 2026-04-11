"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Warehouse } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getAuthErrorMessage } from "@/lib/auth/auth-messages";
import {
  getAvailablePortals,
  getPortalHref,
  getPortalSelectionState,
  PORTALS,
  type PortalKey,
} from "@/lib/portals";
import { setPreferredPortal } from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export default function SelectPortalPage() {
  const router = useRouter();
  const status = useAuthSessionStore((s) => s.status);
  const user = useAuthSessionStore((s) => s.user);
  const setUser = useAuthSessionStore((s) => s.setUser);
  const [selecting, setSelecting] = useState<PortalKey | null>(null);
  const availablePortals = getAvailablePortals(user);
  const preferredPortal = user
    ? getPortalSelectionState(user).preferredPortal
    : null;

  useEffect(() => {
    if (status === "refreshing") return;
    if (status === "anonymous") {
      router.replace(toRoute("/login"));
    }
  }, [status, router]);

  const selectMutation = useMutation({
    mutationFn: (portal: PortalKey) => setPreferredPortal(portal),
    onSuccess(_, portal) {
      if (user) setUser({ ...user, preferredPortal: portal });
      router.push(getPortalHref(portal));
    },
  });

  const authError = selectMutation.error
    ? getAuthErrorMessage(selectMutation.error)
    : null;

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    if (availablePortals.length === 0) {
      router.replace(toRoute("/"));
      return;
    }

    if (availablePortals.length === 1) {
      const portal = availablePortals[0];

      if (!portal) {
        return;
      }

      if (preferredPortal === portal) {
        router.replace(getPortalHref(portal));
        return;
      }

      if (selectMutation.isPending) {
        return;
      }

      setSelecting(portal);
      void selectMutation.mutateAsync(portal);
    }
  }, [availablePortals, preferredPortal, router, selectMutation, status, user]);

  function handleSelect(portal: PortalKey) {
    if (selectMutation.isPending) return;
    setSelecting(portal);
    void selectMutation.mutateAsync(portal);
  }

  if (
    status === "refreshing" ||
    status === "anonymous" ||
    (status === "authenticated" && availablePortals.length <= 1)
  ) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-10 flex flex-col items-center gap-2">
          <Link
            aria-label="Go to home"
            href={toRoute("/")}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary transition-opacity hover:opacity-85"
          >
            <Warehouse className="h-5 w-5 text-primary-foreground" />
          </Link>
          <span className="brand-wordmark text-foreground">Shop</span>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Where are you headed?
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Select your portal. You can switch at any time from the nav bar.
          </p>
        </div>

        {authError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>{authError.title}</AlertTitle>
            <AlertDescription>{authError.detail}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availablePortals.map((portal) => {
            const { key, label, description, Icon } = PORTALS[portal];
            const isLoading = selecting === key && selectMutation.isPending;
            const isDisabled = selectMutation.isPending;

            return (
              <button
                key={key}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(key)}
                className={cn(
                  "group flex items-start gap-4 rounded-md border border-border bg-card p-5 text-left transition-all",
                  "hover:border-primary/50 hover:bg-primary/[0.03]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  selecting === key && "border-primary/60 bg-primary/[0.04]",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {isLoading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {label}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary/70" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {user ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {user.firstName} {user.lastName}
            </span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
