"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, Package, ShieldCheck, Warehouse } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/auth/auth-client";
import { getPortalHref, getPortalSelectionState } from "@/lib/portals";
import { currentUserQueryKey } from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export default function HomePage() {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: currentUserQueryKey });
    },
  });

  const portalState = user ? getPortalSelectionState(user) : null;
  const primaryPortal =
    portalState?.preferredPortal ?? portalState?.availablePortals[0] ?? null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
          <Warehouse className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="brand-wordmark text-foreground">Shop</span>
      </div>

      <h1 className="max-w-sm text-center text-3xl font-semibold tracking-tight">
        Stock accountability, end to end.
      </h1>
      <p className="mt-3 max-w-xs text-center text-sm text-muted-foreground">
        Track inventory ownership, manage reservations, and enforce access
        across every warehouse and store.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {status === "authenticated" && user ? (
          <>
            {primaryPortal ? (
              <Link
                className={buttonVariants({ size: "lg" })}
                href={getPortalHref(primaryPortal)}
              >
                Open {primaryPortal}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void logoutMutation.mutateAsync()}
              disabled={logoutMutation.isPending}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "cursor-pointer",
              )}
            >
              Log out
              <LogOut className="size-4" />
            </button>
          </>
        ) : (
          <>
            <Link
              className={buttonVariants({ size: "lg" })}
              href={toRoute("/login")}
            >
              Sign in
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href={toRoute("/register")}
            >
              Create account
            </Link>
          </>
        )}
      </div>

      <div className="mt-16 w-full max-w-xl border border-border">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-start gap-3 bg-card px-5 py-4">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Ownership tracking</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Every variant, every location.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-card px-5 py-4">
            <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Live reservations</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reserved on order, released on fulfilment.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-card px-5 py-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Access control</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Server-checked, no client-side trust.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
