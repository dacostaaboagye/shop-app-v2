"use client";

import { Bell, Receipt } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { NotificationFeedCard } from "@/components/system/notification-feed-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  error,
  isError,
  isPending,
  items,
  moneyProfile,
  onRetry,
}: {
  canViewSales: boolean;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  items: Array<Awaited<ReturnType<typeof fetchWorkerSales>>["items"][number]>;
  moneyProfile: typeof DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  onRetry: () => void;
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

  if (isError) {
    return (
      <AppErrorBanner
        detail="Could not load recent worker sales."
        error={error}
        onRetry={onRetry}
        title="Unable to load sales activity"
      />
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
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/50">
        <div className="flex flex-col gap-1">
          <CardTitle>Latest sales</CardTitle>
          <p className="type-support">
            Recent receipts and credit notes from the active work location.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href={toRoute("/worker/sales/history")}
        >
          View history
        </Link>
      </CardHeader>
      <CardContent className="p-4">
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
                <Badge variant="outline">
                  {invoice.type === "credit_note" ? "Credit note" : "Sale"}
                </Badge>
                <span className="type-data-value text-sm tabular-nums">
                  {formatMoney(invoice.totalAmount, moneyProfile)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <Card className="rounded-xl border border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/50">
        <div className="flex flex-col gap-1">
          <CardTitle>Operational updates</CardTitle>
          <p className="type-support">
            Unread alerts and coordination messages that need a response.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href={toRoute(getNotificationCenterHref("/worker"))}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {items.map((notification) => (
          <NotificationFeedCard
            key={notification.notificationKey}
            notification={notification}
            showStatus
            variant="page"
          />
        ))}
      </CardContent>
    </Card>
  );
}
