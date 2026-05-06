"use client";

import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getPortalHref, getPrimaryPortal } from "@/lib/portals";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

export function HomeHero() {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const primaryPortal = user ? getPrimaryPortal(user) : null;

  return (
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
                A high-precision inventory engine built for modern logistics.
                Manage every variant, location, and reservation lifecycle with
                absolute immutable certainty.
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
                        "h-16 rounded-xl px-10 font-heading text-xl font-bold tracking-tight shadow-sm",
                      )}
                      href={toRoute("/login")}
                    >
                      Launch System
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Link>
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "h-16 rounded-xl border-2 px-10 font-heading text-xl font-bold",
                      )}
                      href="#"
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
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl transition-transform duration-500 hover:scale-[1.02]">
              <div
                aria-label="System Illustration"
                className="absolute inset-0 bg-cover bg-center"
                role="img"
                style={{ backgroundImage: "url('/hero.png')" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
