"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ClipboardList, Package, Receipt } from "lucide-react";
import { useMemo } from "react";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney } from "@/lib/money/format-money";
import {
  fetchManagerDashboardSummary,
  managerDashboardSummaryQueryKey,
} from "@/lib/react-query/manager-dashboard";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";
import {
  ManagerDashboardSalesPanel,
  ManagerDashboardTransferPanel,
} from "./manager-dashboard-overview.sections";

export function ManagerDashboardOverview() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.view");
  const locationId = selectedLocationScope?.locationId ?? "";
  const locationPermissions = selectedLocationScope?.permissions ?? [];
  const canManageTransfers = locationPermissions.includes(
    "stock.supply.manage",
  );
  const canViewSales =
    locationPermissions.includes("pos.sales.manage") ||
    locationPermissions.includes("pos.sales.view");

  const dashboardQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerDashboardSummary(locationId),
    queryKey: managerDashboardSummaryQueryKey(locationId),
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () => fetchOfficialDocumentProfile(locationId),
    queryKey: officialDocumentProfileQueryKey(locationId),
    staleTime: 5 * 60_000,
  });

  const metrics = {
    averageSaleValue: dashboardQuery.data?.sales?.averageSaleValue ?? 0,
    lowStockCount: dashboardQuery.data?.lowStockCount ?? 0,
    openTransferCount: dashboardQuery.data?.transfers?.openTransferCount ?? 0,
    skuCount: dashboardQuery.data?.skuCount ?? 0,
    todaysRevenue: dashboardQuery.data?.sales?.todaysRevenue ?? 0,
    transactionCount: dashboardQuery.data?.sales?.transactionCount ?? 0,
  };
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  const activeTransfers = useMemo(
    () =>
      canManageTransfers
        ? dashboardQuery.data?.transfers?.activeTransfers ?? []
        : [],
    [canManageTransfers, dashboardQuery.data?.transfers?.activeTransfers],
  );

  return (
    <PageShell>
      <PageHeader
        description="Money first, then the stock and transfer work that affects it."
        title="Manager overview"
      />

      <LocationScopePanel
        description="Overview metrics follow the managed location you select here."
        emptyDescription="No managed location is available for manager operations."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Operating location"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          description="Confirmed sales total for today."
          href={toRoute("/manager/sales")}
          icon={Receipt}
          label="Revenue today"
          value={renderMoneyValue(
            canViewSales,
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.todaysRevenue,
            moneyProfile,
          )}
        />
        <StatCard
          description="Completed sales counted in today's revenue."
          href={toRoute("/manager/sales")}
          icon={Receipt}
          label="Transactions"
          value={renderStatValue(
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.transactionCount,
          )}
        />
        <StatCard
          description="Average value per recorded sale today."
          href={toRoute("/manager/sales")}
          icon={Receipt}
          label="Average sale"
          value={renderMoneyValue(
            canViewSales,
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.averageSaleValue,
            moneyProfile,
          )}
        />
        <StatCard
          description="Tracked SKUs at this location."
          href={toRoute("/manager/stock")}
          icon={Package}
          label="SKUs"
          value={renderStatValue(
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.skuCount,
          )}
        />
        <StatCard
          description="SKUs below the available stock threshold."
          href={toRoute("/manager/stock")}
          icon={ClipboardList}
          label="Low stock"
          value={renderStatValue(
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.lowStockCount,
          )}
        />
        <StatCard
          description="Transfers still moving through review or receipt."
          href={toRoute("/manager/transfers")}
          icon={ArrowLeftRight}
          label="Open transfers"
          value={renderStatValue(
            dashboardQuery.isPending,
            dashboardQuery.isError,
            metrics.openTransferCount,
          )}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ManagerDashboardSalesPanel
          canViewSales={canViewSales}
          isPending={dashboardQuery.isPending}
          items={dashboardQuery.data?.sales?.latestSales ?? []}
          moneyProfile={moneyProfile}
        />
        <ManagerDashboardTransferPanel
          error={dashboardQuery.isError ? dashboardQuery.error : null}
          isError={dashboardQuery.isError}
          isPending={dashboardQuery.isPending}
          items={activeTransfers}
          onRetry={() => void dashboardQuery.refetch()}
        />
      </section>
    </PageShell>
  );
}

function renderStatValue(isPending: boolean, isError: boolean, value: number) {
  if (isPending) {
    return <Skeleton className="h-9 w-14 rounded-md" />;
  }

  if (isError) {
    return "Unavailable";
  }

  return value;
}

function renderMoneyValue(
  isEnabled: boolean,
  isPending: boolean,
  isError: boolean,
  value: number,
  moneyProfile: typeof DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
) {
  if (isPending) {
    return <Skeleton className="h-9 w-20 rounded-md" />;
  }

  if (isError) {
    return "Unavailable";
  }

  if (!isEnabled) {
    return "Not enabled";
  }

  return formatMoney(value, moneyProfile);
}
