"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Filter,
  Package,
  Search,
  ShieldCheck,
  Terminal,
  Warehouse,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/auth/auth-client";
import { getPortalHref, getPrimaryPortal } from "@/lib/portals";
import { authQueryKey } from "@/lib/react-query/auth";
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
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });

  const primaryPortal = user ? getPrimaryPortal(user) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10">
      {/* Premium Glass Header */}
      <header className="fixed top-0 z-50 w-full px-6 py-6">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between rounded-2xl border border-border/40 bg-background/60 px-8 py-4 backdrop-blur-xl shadow-lg shadow-black/5">
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

      <main className="flex-1">
        {/* Refined Hero Section */}
        <section className="relative overflow-hidden px-6 pt-40 pb-20 lg:pt-52 lg:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="flex flex-col gap-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
                    <Zap className="h-3 w-3" />
                    Operational Excellence v2.0
                  </div>
                  <h1 className="font-heading text-6xl font-bold leading-[1] tracking-tighter sm:text-7xl lg:text-8xl">
                    Accountability <br />
                    <span className="text-muted-foreground/30 font-light">
                      meets
                    </span>{" "}
                    <span className="text-primary italic">precision.</span>
                  </h1>
                  <p className="max-w-[580px] font-sans text-xl leading-relaxed text-muted-foreground/80 md:text-2xl">
                    A high-precision inventory engine built for modern
                    logistics. Manage every variant, location, and reservation
                    lifecycle with absolute immutable certainty.
                  </p>
                  <div className="flex flex-wrap gap-5 pt-4">
                    {status === "authenticated" && primaryPortal ? (
                      <Link
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "h-16 rounded-2xl px-10 font-heading text-xl font-bold tracking-tight shadow-xl shadow-primary/30",
                        )}
                        href={getPortalHref(primaryPortal)}
                      >
                        Enter Portal
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Link>
                    ) : (
                      <>
                        <Link
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "h-16 rounded-2xl px-10 font-heading text-xl font-bold tracking-tight shadow-xl shadow-primary/30",
                          )}
                          href={toRoute("/login")}
                        >
                          Launch System
                          <ArrowRight className="ml-3 h-6 w-6" />
                        </Link>
                        <Link
                          className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "h-16 rounded-2xl border-2 px-10 font-heading text-xl font-bold",
                          )}
                          href={toRoute("/register")}
                        >
                          View Docs
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 relative hidden lg:block">
                <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full translate-x-12 translate-y-12" />
                <div className="relative aspect-square rounded-[3rem] overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                  <Image
                    src="/hero.png"
                    alt="System Illustration"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid - Surface Layered (No explicit cards) */}
        <section className="px-6 py-24 bg-muted/20 border-y border-border/40">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-16 md:flex-row md:items-end md:justify-between mb-20">
              <div className="space-y-4">
                <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
                  Infrastructure
                </h2>
                <p className="text-lg text-muted-foreground max-w-md">
                  The core pillars of our inventory management system.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full max-w-md">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    type="search"
                    placeholder="Search modules..."
                    className="h-14 w-full rounded-2xl border border-border bg-background/50 pl-12 pr-4 text-sm font-medium transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
                  />
                </div>
                <button
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background/50 transition-all hover:bg-background active:scale-95"
                  type="button"
                >
                  <Filter className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/40 overflow-hidden rounded-[2.5rem] border border-border/40">
              {/* Feature 1 */}
              <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-4">
                  Ownership
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track every inventory variant across thousands of locations
                  with absolute certainty. Ledger-based accounting for arrival
                  to final dispatch.
                </p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-4">
                  Reservations
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Atomic locking for zero over-selling. Live reservation
                  lifecycles that bridge the gap between checkout and
                  fulfillment.
                </p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-4">
                  Security
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Zero-trust enforcement on every byte. Server-checked
                  permissions enforced at the core database level.
                </p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Section */}
        <section className="px-6 py-32">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-block mb-8 p-4 rounded-3xl bg-muted/40 backdrop-blur-sm border border-border/40">
              <Terminal className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-heading text-5xl font-bold mb-8">
              Ready to deploy?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join the organizations using Shop V2 to maintain 100% stock
              accuracy across their entire supply chain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={toRoute("/register")}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-16 rounded-2xl px-12 font-bold text-lg",
                )}
              >
                Create Enterprise Account
              </Link>
              <Link
                href="#"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-16 rounded-2xl px-12 font-bold text-lg",
                )}
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Refined Footer */}
      <footer className="border-t border-border/20 py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <Warehouse className="h-6 w-6 text-primary" />
                <span className="font-heading text-2xl font-bold tracking-tight">
                  Shop.
                </span>
              </div>
              <p className="max-w-md text-muted-foreground leading-relaxed text-lg">
                High-precision inventory management for organizations that
                cannot afford errors. Built for performance, security, and
                absolute accountability.
              </p>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Platform
              </p>
              <ul className="space-y-4 font-medium">
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <p className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Resources
              </p>
              <ul className="space-y-4 font-medium">
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-primary transition-colors"
                  >
                    Legal
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-border/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-medium">
              © 2026 Shop Inc. All rights reserved.
            </p>
            <div className="flex gap-8 text-sm font-medium text-muted-foreground">
              <Link href="#" className="hover:text-primary">
                Twitter
              </Link>
              <Link href="#" className="hover:text-primary">
                GitHub
              </Link>
              <Link href="#" className="hover:text-primary">
                LinkedIn
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
