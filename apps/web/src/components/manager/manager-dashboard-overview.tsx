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
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchManagerSales,
  managerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import {
  fetchManagerStockBalances,
  managerStockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";
import {
  fetchManagerSupplyRequests,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { toRoute } from "@/lib/routes";
import {
  ManagerDashboardSalesPanel,
  ManagerDashboardTransferPanel,
} from "./manager-dashboard-overview.sections";
import { getManagerDashboardMetrics } from "./manager-dashboard-overview.support";

const TODAY = new Date();
const START_OF_TODAY = new Date(
  Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate()),
).toISOString();

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

  const stockQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchManagerStockBalances({ locationId, page: 1, pageSize: 50, q: "" }),
    queryKey: managerStockBalancesQueryKey(
      selectedLocationScope ? { locationId, page: 1, pageSize: 50, q: "" } : {},
    ),
    staleTime: 30_000,
  });
  const transfersQuery = useQuery({
    enabled: !!selectedLocationScope && canManageTransfers,
    queryFn: () =>
      fetchManagerSupplyRequests({ locationId, page: 1, pageSize: 25 }),
    queryKey: managerSupplyRequestsQueryKey({
      locationId,
      page: 1,
      pageSize: 25,
    }),
    staleTime: 30_000,
  });
  const salesQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () =>
      fetchManagerSales({
        dateFrom: START_OF_TODAY,
        locationId,
        page: 1,
        pageSize: 10,
      }),
    queryKey: managerSalesQueryKey({
      dateFrom: START_OF_TODAY,
      locationId,
      page: 1,
      pageSize: 10,
    }),
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope && canViewSales,
    queryFn: () => fetchOfficialDocumentProfile(locationId),
    queryKey: officialDocumentProfileQueryKey(locationId),
    staleTime: 5 * 60_000,
  });

  const metrics = getManagerDashboardMetrics({
    sales: salesQuery.data?.items ?? [],
    stock: stockQuery.data?.items ?? [],
    transfers: transfersQuery.data?.items ?? [],
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  const activeTransfers = useMemo(
    () =>
      (transfersQuery.data?.items ?? [])
        .filter(
          (item) =>
            item.status === "pending" ||
            item.status === "approved" ||
            item.status === "dispatched",
        )
        .slice(0, 4),
    [transfersQuery.data?.items],
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
            salesQuery.isPending,
            salesQuery.isError,
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
            salesQuery.isPending,
            salesQuery.isError,
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
            salesQuery.isPending,
            salesQuery.isError,
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
            stockQuery.isPending,
            stockQuery.isError,
            metrics.skuCount,
          )}
        />
        <StatCard
          description="SKUs below the available stock threshold."
          href={toRoute("/manager/stock")}
          icon={ClipboardList}
          label="Low stock"
          value={renderStatValue(
            stockQuery.isPending,
            stockQuery.isError,
            metrics.lowStockCount,
          )}
        />
        <StatCard
          description="Transfers still moving through review or receipt."
          href={toRoute("/manager/transfers")}
          icon={ArrowLeftRight}
          label="Open transfers"
          value={renderStatValue(
            transfersQuery.isPending,
            transfersQuery.isError,
            metrics.openTransferCount,
          )}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ManagerDashboardSalesPanel
          canViewSales={canViewSales}
          isPending={salesQuery.isPending}
          items={salesQuery.data?.items.slice(0, 5) ?? []}
          moneyProfile={moneyProfile}
        />
        <ManagerDashboardTransferPanel
          error={transfersQuery.isError ? transfersQuery.error : null}
          isError={transfersQuery.isError}
          isPending={transfersQuery.isPending}
          items={activeTransfers}
          onRetry={() => void transfersQuery.refetch()}
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
