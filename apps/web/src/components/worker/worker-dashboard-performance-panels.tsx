"use client";

import type { WorkerDashboardSalesMetrics } from "@shop/contracts";
import { Receipt, ShoppingCart, TrendingDown, Wallet } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney } from "@/lib/money/format-money";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { WorkerSalesPerformanceChart } from "./worker-sales-performance-chart";

export function WorkerSalesInsightsPanel({
  error,
  isError,
  isPending,
  metrics,
  moneyProfile,
  onRetry,
}: {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  metrics: WorkerDashboardSalesMetrics | null;
  moneyProfile: typeof DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  onRetry: () => void;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <Skeleton className="h-32 rounded-xl" key={key} />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <AppErrorBanner
        detail="Could not load worker sales insights."
        error={error}
        onRetry={onRetry}
        title="Unable to load sales insights"
      />
    );
  }

  if (!metrics || metrics.recentTimelineDays.length === 0) {
    return (
      <AppEmptyState
        description="Once sales start landing for this week, the dashboard will show revenue movement and return pressure here."
        icon={Receipt}
        title="No recent sales insights"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={Wallet}
          label="Today's net revenue"
          value={formatMoney(metrics.todayNetRevenueAmount, moneyProfile)}
        />
        <MetricCard
          icon={Receipt}
          label="Receipts today"
          value={String(metrics.todayReceiptCount)}
        />
        <MetricCard
          icon={ShoppingCart}
          label="Average receipt"
          value={formatMoney(metrics.todayAverageReceiptAmount, moneyProfile)}
        />
        <MetricCard
          icon={TrendingDown}
          label="7-day return pressure"
          value={`${metrics.recentReturnRate}%`}
        />
      </div>

      <WorkerSalesPerformanceChart
        days={metrics.recentTimelineDays}
        moneyProfile={moneyProfile}
      />
    </div>
  );
}

export function WorkerOperationsFocusPanel({
  canProcessSales,
  lowStockCount,
  recentCreditNoteCount,
  recentNetRevenueAmount,
  unreadNotificationCount,
  moneyProfile,
}: {
  canProcessSales: boolean;
  lowStockCount: number;
  recentCreditNoteCount: number;
  recentNetRevenueAmount: number;
  unreadNotificationCount: number;
  moneyProfile: typeof DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
}) {
  return (
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/50">
        <CardTitle>Attention now</CardTitle>
        <div className="flex flex-wrap gap-2">
          {canProcessSales ? (
            <Link
              className={cn(buttonVariants({ size: "sm", variant: "default" }))}
              href={toRoute("/worker/sales")}
            >
              Start sale
            </Link>
          ) : null}
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            href={toRoute("/worker/sales/history")}
          >
            Sales history
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="grid gap-3">
          <FocusRow
            href="/worker/assignments"
            label="Low stock assignments"
            value={String(lowStockCount)}
          />
          <FocusRow
            href="/worker/notifications"
            label="Unread updates"
            value={String(unreadNotificationCount)}
          />
          <FocusRow
            href="/worker/sales/history"
            label="Returns this week"
            value={String(recentCreditNoteCount)}
          />
          <FocusRow
            href="/worker/sales/history"
            label="7-day payable sales"
            value={formatMoney(recentNetRevenueAmount, moneyProfile)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardContent className="grid min-h-40 grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5">
        <div className="min-w-0">
          <p className="type-data-label text-[11px]">{label}</p>
          <div className="mt-4 min-w-0">{renderMetricValue(value)}</div>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function renderMetricValue(value: string) {
  const moneyMatch = /^([A-Z]{3})\s+(.+)$/.exec(value.trim());

  if (!moneyMatch) {
    return (
      <p className="type-data-value text-[clamp(2rem,2.1vw,2.8rem)] leading-[1.05] tabular-nums">
        {value}
      </p>
    );
  }

  const [, currencyCode, amount] = moneyMatch;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="type-data-label text-xs">{currencyCode}</p>
      <p className="type-data-value text-[clamp(2rem,2.1vw,2.8rem)] leading-[1.05] tabular-nums">
        {amount}
      </p>
    </div>
  );
}

function FocusRow({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      className="rounded-lg border border-border/50 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
      href={toRoute(href)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="type-data-label">{label}</p>
        </div>
        <span className="type-data-value shrink-0 text-lg tabular-nums">
          {value}
        </span>
      </div>
    </Link>
  );
}
