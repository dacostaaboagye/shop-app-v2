"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LogOut, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/lib/auth/auth-client";
import { getPrimaryPortal, PORTALS } from "@/lib/portals";
import { authQueryKey } from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export function AppNav() {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });

  const portal = user
    ? (() => {
        const primaryPortal = getPrimaryPortal(user);
        return primaryPortal ? PORTALS[primaryPortal] : null;
      })()
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-sidebar/90 backdrop-blur-sm">
      <div
        style={{ maxWidth: "var(--grid-width)" }}
        className="mx-auto flex h-13 items-center justify-between px-4 sm:px-6"
      >
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-semibold text-foreground hover:text-foreground/80"
          >
            <ShoppingBag className="size-4 text-primary" />
            Shop
          </Link>
          {portal ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <Link
                href={portal.href}
                className="font-medium text-foreground hover:text-foreground/80"
              >
                {portal.label}
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {status === "authenticated" && user ? (
            <>
              <span className="mx-2 hidden h-3.5 w-px bg-border sm:block" />
              <span className="hidden text-sm text-muted-foreground sm:block">
                {user.firstName} {user.lastName}
              </span>
              <Button
                disabled={logoutMutation.isPending}
                onClick={() => void logoutMutation.mutateAsync()}
                size="sm"
                type="button"
                variant="ghost"
                className="ml-1"
              >
                {logoutMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LogOut className="size-3.5" />
                )}
                <span className="sr-only">Log out</span>
              </Button>
            </>
          ) : status !== "refreshing" ? (
            <>
              <Link
                className={buttonVariants({ size: "sm", variant: "ghost" })}
                href={toRoute("/login")}
              >
                Sign in
              </Link>
              <Link
                className={buttonVariants({ size: "sm" })}
                href={toRoute("/register")}
              >
                Create account
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
