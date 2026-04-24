"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Warehouse } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/auth/auth-client";
import { authQueryKey } from "@/lib/react-query/auth";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export function HomeHeader() {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess() {
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });

  return (
    <header className="fixed top-0 z-50 w-full px-6 py-6">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between rounded-xl border border-border/40 bg-background/60 px-8 py-4 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Warehouse className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-2xl font-bold tracking-tight">
            Shop.
          </span>
        </div>

        <nav className="flex items-center gap-8">
          <div className="hidden items-center gap-8 lg:flex">
            <Link
              href="#"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Platform
            </Link>
            <Link
              href="#"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Solutions
            </Link>
            <Link
              href="#"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
          </div>
          <div className="h-6 w-px bg-border/40" />
          {status === "authenticated" && user ? (
            <div className="flex items-center gap-6">
              <span className="hidden text-xs font-bold uppercase tracking-wider text-muted-foreground lg:inline-block">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void logoutMutation.mutateAsync()}
                disabled={logoutMutation.isPending}
                className="rounded-xl border border-border bg-background/50 px-5 py-2 text-xs font-bold transition-all hover:bg-muted hover:shadow-md"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                className="text-sm font-bold text-muted-foreground hover:text-foreground"
                href={toRoute("/login")}
              >
                Sign in
              </Link>
              <Link
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-xl px-6 font-bold shadow-md shadow-primary/20",
                )}
                href={toRoute("/register")}
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
