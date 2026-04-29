"use client";

import { Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/display/format";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getStockStatus } from "./assignments/worker-assignments-support";
import type { WorkerStockSummary } from "./worker-dashboard-overview.support";

export function WorkerActionCenterPanel({
  canProcessSales,
  lowStockCount,
  outOfStockCount,
  todaySalesCount,
  unreadNotificationCount,
}: {
  canProcessSales: boolean;
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesCount: number;
  unreadNotificationCount: number;
}) {
  const priorityItems = [
    {
      description: "Variants already unavailable for sale right now.",
      href: toRoute("/worker/assignments"),
      label: "Out of stock",
      value: outOfStockCount,
    },
    {
      description: "Variants that are likely to need replenishment next.",
      href: toRoute("/worker/assignments"),
      label: "Low stock",
      value: lowStockCount,
    },
    {
      description: "Unread updates that could affect today's work.",
      href: toRoute("/worker/notifications"),
      label: "Unread alerts",
      value: unreadNotificationCount,
    },
    {
      description: "Receipts captured so far today at this location.",
      href: toRoute("/worker/sales/history"),
      label: "Today's sales",
      value: todaySalesCount,
    },
  ];

  return (
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>What needs attention</CardTitle>
        <p className="type-support">
          Focus first on blockers to sales, then on updates that change the
          day's plan.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        {canProcessSales ? (
          <Link
            className={cn(buttonVariants({ className: "w-full", size: "sm" }))}
            href={toRoute("/worker/sales")}
          >
            <ShoppingCart data-icon="inline-start" />
            Start sale
          </Link>
        ) : null}

        <div className="flex flex-col gap-3">
          {priorityItems.map((item) => (
            <Link
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              href={item.href}
              key={item.label}
            >
              <div className="min-w-0">
                <p className="type-data-label">{item.label}</p>
                <p className="type-support text-xs">{item.description}</p>
              </div>
              <span className="type-data-value text-lg tabular-nums">
                {formatCount(item.value)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkerStockHealthPanel({
  error,
  isError,
  isPending,
  locationName,
  onRetry,
  stockSummary,
}: {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  locationName: string | undefined;
  onRetry: () => void;
  stockSummary: WorkerStockSummary;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        {[1, 2, 3].map((key) => (
          <Skeleton className="h-24 w-full rounded-xl" key={key} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <AppErrorBanner
        detail="Could not load worker stock health."
        error={error}
        onRetry={onRetry}
        title="Unable to load stock health"
      />
    );
  }

  return (
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Stock at risk</CardTitle>
        <p className="type-support">
          Variants most likely to block sales
          {locationName ? ` at ${locationName}` : ""}.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill
            label="Available units"
            value={stockSummary.totalAvailableUnits}
          />
          <MetricPill
            label="Low stock variants"
            value={stockSummary.lowStockCount}
          />
          <MetricPill
            label="Out of stock variants"
            value={stockSummary.outOfStockCount}
          />
        </div>

        {stockSummary.topRiskAssignments.length === 0 ? (
          <AppEmptyState
            description="No assigned variants are currently in a low-stock or out-of-stock state."
            icon={Package}
            title="No urgent stock gaps"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {stockSummary.topRiskAssignments.map((assignment) => {
              const status = getStockStatus(assignment.availableQuantity);
              const statusLabel =
                status === "out_of_stock"
                  ? "Out"
                  : status === "low_stock"
                    ? "Low"
                    : "Good";

              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
                  key={assignment.skuId}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumbnail
                      className="size-12 rounded-lg"
                      imageUrl={assignment.primaryImageUrl}
                      productName={assignment.productName}
                      variantName={assignment.variantName}
                    />
                    <div className="min-w-0">
                      <p className="type-data-value text-sm">
                        {assignment.productName}
                      </p>
                      <p className="type-support text-xs">
                        {assignment.variantName} · {assignment.sku}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="type-data-value text-sm tabular-nums">
                        {formatCount(assignment.availableQuantity)}
                      </p>
                      <p className="type-support text-xs">
                        of {formatCount(assignment.quantity)} assigned
                      </p>
                    </div>
                    <Badge variant="outline">{statusLabel}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
      <p className="type-data-label">{label}</p>
      <p className="type-data-value mt-2 text-xl tabular-nums">
        {formatCount(value)}
      </p>
    </div>
  );
}
