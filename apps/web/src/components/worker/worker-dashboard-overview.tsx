"use client";

import {
  AlertCircle,
  ClipboardList,
  History,
  Package,
  Plus,
  ScanLine,
  Truck,
} from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { MenuCard, StatCard } from "@/components/system/page-shell";
import { toRoute } from "@/lib/routes";

const RECENT_ACTIVITY_ITEMS = [
  "Sale processed for iPhone 15 Pro",
  "Stock assignment updated for Samsung Galaxy A55",
  "Receipt PDF prepared for customer handover",
] as const;

export function WorkerDashboardOverview() {
  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          description="Variants currently assigned to your stock responsibility."
          icon={Package}
          label="Assigned Variants"
          value={12}
        />
        <StatCard
          description="Assigned variants that need replenishment soon."
          icon={AlertCircle}
          label="Low Stock"
          value={3}
        />
        <StatCard
          description="Incoming stock custody transfers waiting for you."
          icon={Truck}
          label="Pending Handovers"
          value={0}
        />
        <StatCard
          description="Completed sales recorded during the last day."
          icon={History}
          label="Recent Sales"
          value={8}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MenuCard
          description="Start a new point-of-sale transaction."
          href={toRoute("/worker/sales")}
          icon={Plus}
          title="New Sale"
        />
        <MenuCard
          description="Review the stock variants currently assigned to you."
          href={toRoute("/worker/assignments")}
          icon={ClipboardList}
          title="My Assignments"
        />
        <MenuCard
          description="Review pending stock custody transfers and completed handovers."
          href={toRoute("/worker/handovers")}
          icon={ScanLine}
          title="Stock Handovers"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="feedback-title">Recent Activity</h2>
            <p className="feedback-description">
              Recent worker-side actions that affect sales, assignments, and
              stock custody.
            </p>
          </div>
          <div className="mt-6 grid gap-4">
            {RECENT_ACTIVITY_ITEMS.map((item) => (
              <div key={item} className="flex items-start gap-4">
                <div className="size-2 shrink-0 rounded-full bg-primary" />
                <p className="type-support flex-1 text-foreground">{item}</p>
                <span className="type-data-label shrink-0 text-[10px]">
                  2h ago
                </span>
              </div>
            ))}
          </div>
        </div>

        <AppEmptyState
          description="You will see new operational alerts here when tasks, route changes, or stock events need your attention."
          icon={ClipboardList}
          title="No new notifications"
        />
      </section>
    </div>
  );
}
