"use client";

import { Bell, Receipt } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { NotificationFeedCard } from "@/components/system/notification-feed-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPublicReference } from "@/lib/display/format";
import type { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney } from "@/lib/money/format-money";
import { getNotificationCenterHref } from "@/lib/notifications/notification-route";
import type { fetchNotifications } from "@/lib/react-query/notifications";
import type { fetchWorkerSales } from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function RecentSalesPanel({
  canViewSales,
  isPending,
  items,
  moneyProfile,
}: {
  canViewSales: boolean;
  isPending: boolean;
  items: Array<Awaited<ReturnType<typeof fetchWorkerSales>>["items"][number]>;
  moneyProfile: typeof DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
}) {
  if (!canViewSales) {
    return (
      <AppEmptyState
        description="Sales history becomes available here when your worker role includes sales access."
        icon={Receipt}
        title="Sales view not enabled"
      />
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        {[1, 2, 3].map((key) => (
          <Skeleton className="h-16 w-full rounded-xl" key={key} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <AppEmptyState
        description="No sales have been recorded yet for the active worker location today."
        icon={Receipt}
        title="No sales recorded today"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="feedback-title">Recent Sales</h2>
          <p className="feedback-description">
            Today&apos;s latest sales from your active worker location.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href={toRoute("/worker/sales/history")}
        >
          View history
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {items.map((invoice) => (
          <Link
            className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
            href={toRoute(
              `/worker/sales/${encodeURIComponent(invoice.reference)}`,
            )}
            key={invoice.reference}
          >
            <div className="min-w-0">
              <p className="type-data-value text-sm">
                {formatPublicReference(invoice.reference)}
              </p>
              <p className="type-support text-xs">
                {formatDateTime(invoice.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="type-data-label text-[10px]">
                {invoice.type === "credit_note" ? "Credit Note" : "Sale"}
              </span>
              <span className="type-data-value text-sm tabular-nums">
                {formatMoney(invoice.totalAmount, moneyProfile)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function WorkerNotificationsPanel({
  error,
  isError,
  isPending,
  items,
  onRetry,
}: {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  items: Array<Awaited<ReturnType<typeof fetchNotifications>>["items"][number]>;
  onRetry: () => void;
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
        detail="Could not load worker notifications."
        error={error}
        onRetry={onRetry}
        title="Unable to load notifications"
      />
    );
  }

  if (items.length === 0) {
    return (
      <AppEmptyState
        description="New operational updates from admins and other operations roles will appear here when action is needed."
        icon={Bell}
        title="No unread notifications"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="feedback-title">Operational Updates</h2>
          <p className="feedback-description">
            Recent unread notifications sent to your worker account.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href={toRoute(getNotificationCenterHref("/worker"))}
        >
          View all
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((notification) => (
          <NotificationFeedCard
            key={notification.notificationKey}
            notification={notification}
            showStatus
            variant="page"
          />
        ))}
      </div>
    </div>
  );
}

export function startOfTodayIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}
