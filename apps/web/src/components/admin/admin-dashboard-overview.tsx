"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Receipt, Store } from "lucide-react";
import { useMemo } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney, toNumericAmount } from "@/lib/money/format-money";
import {
  fetchManagerSales,
  managerSalesQueryKey,
} from "@/lib/react-query/pos-sales";
import {
  fetchManagerIncomingSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { toRoute } from "@/lib/routes";
import {
  AdminDashboardTransferPanel,
  AdminStoreProductivityPanel,
} from "./admin-dashboard-overview.sections";
import {
  getAdminTransferMetrics,
  getOpenAdminTransfers,
} from "./admin-dashboard-overview.support";

const TRANSFER_QUERY = { page: 1, pageSize: 50 } as const;
const SALES_PAGE_SIZE = 100;
const TODAY = new Date();
const START_OF_TODAY = new Date(
  Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate()),
).toISOString();

export function AdminDashboardOverview() {
  const { can } = useAuthorization();
  const salesScopePermission = can("pos.sales.manage")
    ? "pos.sales.manage"
    : "pos.sales.view";
  const { accessibleLocationScopes, isLoading } =
    usePermissionLocationScope(salesScopePermission);
  const canViewSales = can("pos.sales.manage") || can("pos.sales.view");

  const transfersQuery = useQuery({
    queryFn: () => fetchManagerIncomingSupplyRequests(TRANSFER_QUERY),
    queryKey: managerIncomingSupplyRequestsQueryKey(TRANSFER_QUERY),
    staleTime: 30_000,
  });
  const salesQueries = useQueries({
    queries: accessibleLocationScopes.map((scope) => ({
      enabled: !!scope.locationId && canViewSales,
      queryFn: () =>
        fetchManagerSales({
          dateFrom: START_OF_TODAY,
          locationId: scope.locationId,
          page: 1,
          pageSize: SALES_PAGE_SIZE,
        }),
      queryKey: managerSalesQueryKey({
        dateFrom: START_OF_TODAY,
        locationId: scope.locationId,
        page: 1,
        pageSize: SALES_PAGE_SIZE,
      }),
      staleTime: 30_000,
    })),
  });

  const transferItems = transfersQuery.data?.items ?? [];
  const transferMetrics = getAdminTransferMetrics(transferItems);
  const openTransferItems = getOpenAdminTransfers(transferItems, 4);
  const productivityItems = useMemo(
    () =>
      accessibleLocationScopes
        .map((scope, index) => {
          const data = salesQueries[index]?.data;
          const posItems =
            data?.items.filter((item) => item.type === "pos") ?? [];
          const revenue = posItems.reduce(
            (sum, item) => sum + (toNumericAmount(item.totalAmount) ?? 0),
            0,
          );

          return {
            locationName: scope.locationName,
            locationSlug: scope.locationSlug,
            revenue,
            transactionCount: posItems.length,
          };
        })
        .sort((left, right) => right.revenue - left.revenue),
    [accessibleLocationScopes, salesQueries],
  );
  const productivityPending =
    isLoading || salesQueries.some((query) => query.isPending);
  const productivityError =
    salesQueries.find((query) => query.isError)?.error ?? null;
  const activeShopsCount = productivityItems.filter(
    (item) => item.transactionCount > 0,
  ).length;
  const networkRevenue = productivityItems.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const networkTransactions = productivityItems.reduce(
    (sum, item) => sum + item.transactionCount,
    0,
  );
  const averageSaleValue =
    networkTransactions > 0 ? networkRevenue / networkTransactions : 0;

  return (
    <PageShell>
      <PageHeader
        description="Money first, then the transfer work that can block it."
        title="Admin overview"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          description="Revenue recorded across visible shop locations today."
          href={toRoute("/admin/sales")}
          icon={Receipt}
          label="Revenue today"
          value={renderMoneyValue(
            canViewSales,
            productivityPending,
            !!productivityError,
            networkRevenue,
          )}
        />
        <StatCard
          description="Completed sales counted in today's visible revenue."
          href={toRoute("/admin/sales")}
          icon={Store}
          label="Transactions"
          value={renderCountValue(
            productivityPending,
            !!productivityError,
            networkTransactions,
          )}
        />
        <StatCard
          description="Visible shop locations that have generated sales today."
          href={toRoute("/admin/locations")}
          icon={Store}
          label="Active shops"
          value={renderCountValue(
            productivityPending,
            !!productivityError,
            activeShopsCount,
          )}
        />
        <StatCard
          description="Average sale value across today's visible shop revenue."
          href={toRoute("/admin/sales")}
          icon={Receipt}
          label="Average sale"
          value={renderMoneyValue(
            canViewSales,
            productivityPending,
            !!productivityError,
            averageSaleValue,
          )}
        />
        <StatCard
          description="Transfers still waiting for a source decision."
          href={toRoute("/admin/transfers")}
          icon={ArrowLeftRight}
          label="Needs review"
          value={renderCountValue(
            transfersQuery.isPending,
            transfersQuery.isError,
            transferMetrics.needsReviewCount,
          )}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminStoreProductivityPanel
          error={productivityError}
          isError={!!productivityError}
          isPending={productivityPending}
          items={productivityItems.slice(0, 5)}
          moneyProfile={DEFAULT_OFFICIAL_DOCUMENT_PROFILE}
        />
        <AdminDashboardTransferPanel
          ageingCount={transferMetrics.ageingCount}
          bottleneckCount={transferMetrics.bottleneckCount}
          error={transfersQuery.isError ? transfersQuery.error : null}
          exceptionCount={transferMetrics.exceptionCount}
          isError={transfersQuery.isError}
          isPending={transfersQuery.isPending}
          items={openTransferItems}
          needsReviewCount={transferMetrics.needsReviewCount}
          onRetry={() => void transfersQuery.refetch()}
        />
      </section>
    </PageShell>
  );
}

function renderCountValue(
  isPending: boolean,
  isError: boolean,
  value: number | undefined | null,
) {
  if (isPending) {
    return <Skeleton className="h-9 w-14 rounded-md" />;
  }

  if (isError) {
    return "Unavailable";
  }

  return value ?? 0;
}

function renderMoneyValue(
  isEnabled: boolean,
  isPending: boolean,
  isError: boolean,
  value: number,
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

  return formatMoney(value, DEFAULT_OFFICIAL_DOCUMENT_PROFILE);
}
