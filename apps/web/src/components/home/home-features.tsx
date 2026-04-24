"use client";

import {
  ArrowRight,
  Filter,
  Package,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function HomeFeatures() {
  return (
    <section className="px-6 py-24 bg-muted/20 border-y border-border/40">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-16 md:flex-row md:items-end md:justify-between mb-20">
          <div className="flex flex-col gap-4">
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
                className="h-14 w-full rounded-xl border border-border bg-background/50 pl-12 pr-4 text-sm font-medium transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
              />
            </div>
            <button
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-background/50 transition-all hover:bg-background active:scale-95"
              type="button"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/40 overflow-hidden rounded-[2.5rem] border border-border/40">
          {/* Feature 1 */}
          <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-2xl font-bold mb-4">Ownership</h3>
            <p className="text-muted-foreground leading-relaxed">
              Track every inventory variant across thousands of locations with
              absolute certainty. Ledger-based accounting for arrival to final
              dispatch.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
              Learn more <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-2xl font-bold mb-4">
              Reservations
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Atomic locking for zero over-selling. Live reservation lifecycles
              that bridge the gap between checkout and fulfillment.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
              Learn more <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-background p-12 transition-all hover:bg-muted/30 group">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-2xl font-bold mb-4">Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              Zero-trust enforcement on every byte. Server-checked permissions
              enforced at the core database level.
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-4 transition-all cursor-pointer">
              Learn more <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
