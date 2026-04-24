"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  History,
  Package,
  Plus,
  ScanLine,
  Truck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function WorkerDashboardOverview() {
  return (
    <div className="flex flex-col gap-8">
      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          count={12}
          icon={Package}
          label="Assigned Variants"
          trend="Active stock"
        />
        <StatWidget
          count={3}
          icon={AlertCircle}
          label="Low Stock"
          tone="warning"
          trend="Immediate attention"
        />
        <StatWidget
          count={0}
          icon={Truck}
          label="Pending Handovers"
          trend="Incoming stock"
        />
        <StatWidget
          count={8}
          icon={History}
          label="Recent Sales"
          trend="Last 24 hours"
        />
      </div>

      {/* Action Hub */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          description="Start a new point-of-sale transaction."
          href={toRoute("/worker/sales")}
          icon={Plus}
          title="New Sale"
          variant="primary"
        />
        <ActionCard
          description="View and manage your assigned inventory."
          href={toRoute("/worker/assignments")}
          icon={ClipboardList}
          title="My Assignments"
        />
        <ActionCard
          description="Scan documents to confirm stock handovers."
          href={toRoute("/worker/handovers")}
          icon={ScanLine}
          title="Stock Handover"
        />
      </div>

      {/* Feature Sections Placeholder (Premium Style) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-none bg-muted/40 shadow-none ring-1 ring-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <div className="size-2 rounded-full bg-primary" />
                  <p className="flex-1 text-muted-foreground">
                    Sale processed for{" "}
                    <span className="font-medium text-foreground">
                      iPhone 15 Pro
                    </span>
                  </p>
                  <time className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    2h ago
                  </time>
                </div>
              ))}
              <Link
                href="#"
                className="inline-flex items-center gap-2 pt-2 text-xs font-bold text-primary hover:gap-3 transition-all"
              >
                View all activity <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none bg-card shadow-none ring-1 ring-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl">
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-muted p-3">
                <ClipboardList className="size-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">No new notifications</p>
              <p className="text-xs text-muted-foreground">
                We'll alert you when tasks are assigned.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatWidget({
  label,
  count,
  icon: Icon,
  trend,
  tone = "default",
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  trend: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className="relative overflow-hidden border-none bg-white shadow-sm ring-1 ring-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              {label}
            </span>
            <span className="font-heading text-3xl font-bold tabular-nums">
              {count}
            </span>
          </div>
          <div
            className={cn(
              "rounded-xl p-2.5",
              tone === "warning"
                ? "bg-warning text-warning-foreground shadow-sm"
                : tone === "danger"
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "bg-primary text-primary-foreground shadow-sm",
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60">
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  variant = "default",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: Route;
  variant?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-black/5 active:scale-[0.98]"
    >
      {variant === "primary" && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <div
        className={cn(
          "mb-6 inline-flex size-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
          variant === "primary"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted text-foreground",
        )}
      >
        <Icon className="size-7" />
      </div>
      <h3 className="font-heading text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">
        {description}
      </p>
      <div className="mt-8 flex items-center gap-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
        Open module <ArrowRight className="size-3" />
      </div>
    </Link>
  );
}
