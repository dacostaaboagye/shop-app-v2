"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ClipboardList,
  History,
  Package,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { NotificationFeedCard } from "@/components/system/notification-feed-card";
import { MenuCard, StatCard } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  formatCount,
  formatDateTime,
  formatPublicReference,
} from "@/lib/display/format";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney } from "@/lib/money/format-money";
import { getNotificationCenterHref } from "@/lib/notifications/notification-route";
import {
  fetchNotifications,
  notificationsQueryKey,
} from "@/lib/react-query/notifications";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerSales,
  workerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

const DASHBOARD_NOTIFICATION_LIMIT = 4;

export function WorkerDashboardOverview() {
  const { can } = useAuthorization();
  const canViewSales = can("pos.sales.view");
  const canProcessSales = can("pos.sales.process");
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("Assignment location is required.");
      }
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });
  const salesQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () =>
      fetchWorkerSales({
        dateFrom: startOfTodayIso(),
        locationId: selectedLocationScope?.locationId ?? "",
        page: 1,
        pageSize: 5,
      }),
    queryKey: workerSalesQueryKey({
      dateFrom: startOfTodayIso(),
      locationId: selectedLocationScope?.locationId ?? "",
      page: 1,
      pageSize: 5,
    }),
    staleTime: 30_000,
  });
  const moneyProfileQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const notificationsQuery = useQuery({
    queryFn: () => fetchNotifications(DASHBOARD_NOTIFICATION_LIMIT),
    queryKey: notificationsQueryKey(DASHBOARD_NOTIFICATION_LIMIT),
    staleTime: 30_000,
  });

  const assignments = assignmentsQuery.data?.items ?? [];
  const lowStockCount = useMemo(
    () => assignments.filter((item) => item.availableQuantity <= 5).length,
    [assignments],
  );
  const salesItems = salesQuery.data?.items ?? [];
  const unreadNotifications =
    notificationsQuery.data?.items.filter((item) => item.status === "unread") ??
    [];

  return (
    <div className="flex flex-col gap-8">
      <LocationScopePanel
        description="The worker dashboard follows the assigned operating location already attached to your access."
        emptyDescription="No assigned location is available for worker operations."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Active work location"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Variants currently assigned to your worker stock responsibility."
          href={toRoute("/worker/assignments")}
          icon={Package}
          label="Assigned Variants"
          value={formatCount(assignments.length)}
        />
        <StatCard
          description="Assigned variants with low available quantity that may need replenishment."
          href={toRoute("/worker/assignments")}
          icon={ClipboardList}
          label="Low Stock"
          value={formatCount(lowStockCount)}
        />
        <StatCard
          description="Unread operational updates sent to your worker account."
          href={toRoute(getNotificationCenterHref("/worker"))}
          icon={Bell}
          label="Unread Notifications"
          value={formatCount(notificationsQuery.data?.unreadCount ?? 0)}
        />
        <StatCard
          description="Sales recorded today at your active location."
          href={toRoute("/worker/sales/history")}
          icon={Receipt}
          label="Today's Sales"
          value={
            canViewSales
              ? formatCount(salesQuery.data?.total ?? 0)
              : "Not enabled"
          }
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {canProcessSales ? (
          <MenuCard
            description="Start a new point-of-sale transaction from your assigned stock."
            href={toRoute("/worker/sales")}
            icon={ShoppingCart}
            title="New Sale"
          />
        ) : null}
        <MenuCard
          description="Review the stock variants currently assigned to you."
          href={toRoute("/worker/assignments")}
          icon={ClipboardList}
          title="My Assignments"
        />
        <MenuCard
          description="Review completed sales, receipts, and credit notes for this location."
          href={toRoute("/worker/sales/history")}
          icon={History}
          title="Sales History"
        />
        <MenuCard
          description="Review operational updates, approvals, and route changes sent to your worker account."
          href={toRoute(getNotificationCenterHref("/worker"))}
          icon={Bell}
          title="Notifications"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentSalesPanel
          canViewSales={canViewSales}
          isPending={salesQuery.isPending}
          items={salesItems}
          moneyProfile={
            moneyProfileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE
          }
        />
        <WorkerNotificationsPanel
          error={notificationsQuery.error}
          isError={notificationsQuery.isError}
          isPending={notificationsQuery.isPending}
          items={unreadNotifications}
          onRetry={() => void notificationsQuery.refetch()}
        />
      </section>
    </div>
  );
}

function RecentSalesPanel({
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
            Today's latest sales from your active worker location.
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

function WorkerNotificationsPanel({
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

function startOfTodayIso() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}
