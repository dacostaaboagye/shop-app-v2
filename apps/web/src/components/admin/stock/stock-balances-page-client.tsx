"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useId, useState } from "react";
import {
  getStockBalanceLocationName,
  STOCK_BALANCE_LOCATIONS_QUERY,
  STOCK_CATALOG_FILTER_QUERY,
  useStockBalanceFilter,
} from "@/app/admin/stock/balances/page.support";
import {
  AdminStockFilterPanel,
  formatAdminStockResultLabel,
} from "@/components/admin/stock/admin-stock-filter-panel";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import {
  fetchStockBalances,
  postStockCount,
  stockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";

export function StockBalancesPageClient() {
  const { can } = useAuthorization();
  const queryClient = useQueryClient();
  const filterId = useId();
  const {
    draftFilter,
    filter,
    handleClear,
    handleSubmit,
    hasFilters,
    updateDraft,
  } = useStockBalanceFilter();
  const [countTarget, setCountTarget] =
    useState<AdminStockBalanceSummary | null>(null);
  const [countOpen, setCountOpen] = useState(false);

  const canCount = can("inventory.write");
  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(STOCK_BALANCE_LOCATIONS_QUERY),
    queryKey: adminLocationsQueryKey(STOCK_BALANCE_LOCATIONS_QUERY),
    staleTime: 60_000,
  });
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(STOCK_CATALOG_FILTER_QUERY),
    queryKey: adminBrandsQueryKey(STOCK_CATALOG_FILTER_QUERY),
    staleTime: 60_000,
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(STOCK_CATALOG_FILTER_QUERY),
    queryKey: adminCategoriesQueryKey(STOCK_CATALOG_FILTER_QUERY),
    staleTime: 60_000,
  });
  const stockQuery = useQuery({
    queryFn: () => fetchStockBalances({ ...filter, page: 1, pageSize: 50 }),
    queryKey: stockBalancesQueryKey({ ...filter, page: 1, pageSize: 50 }),
  });
  const countMutation = useMutation({
    mutationFn: postStockCount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock", "balances"] });
      setCountOpen(false);
      setCountTarget(null);
    },
  });

  const columns = buildStockBalanceColumns(
    canCount && filter.locationSlug ? openCountDialog : null,
  );

  function openCountDialog(row: AdminStockBalanceSummary | null) {
    setCountTarget(row);
    countMutation.reset();
    setCountOpen(true);
  }

  return (
    <PageShell>
      <PageHeader
        actions={
          canCount ? (
            <Button
              disabled={!filter.locationSlug}
              onClick={() => openCountDialog(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              <ClipboardList data-icon="inline-start" />
              Enter count
            </Button>
          ) : null
        }
        description="Global stock across all locations with optional location, brand, and category filters."
        title="Stock levels"
      />
      <AdminStockFilterPanel
        brands={brandsQuery.data?.items ?? []}
        brandsLoading={brandsQuery.isPending}
        categories={categoriesQuery.data?.items ?? []}
        categoriesLoading={categoriesQuery.isPending}
        draftFilter={draftFilter}
        filterId={filterId}
        hasFilters={hasFilters}
        locations={locationsQuery.data?.items ?? []}
        locationsLoading={locationsQuery.isPending}
        onClear={handleClear}
        onSubmit={handleSubmit}
        resultLabel={
          stockQuery.data
            ? formatAdminStockResultLabel({
                count: stockQuery.data.totalCount,
                emptyLabel: "SKU",
                locationName:
                  filter.locationSlug && stockQuery.data.locationName
                    ? stockQuery.data.locationName
                    : null,
              })
            : undefined
        }
        updateDraft={updateDraft}
      />

      <AppTableWrapper>
        {stockQuery.isFetching && !stockQuery.data ? (
          <StockWorkspaceTableSkeleton
            keys={["sb-1", "sb-2", "sb-3", "sb-4", "sb-5"]}
            rowClassName="h-12 w-full rounded-lg"
          />
        ) : stockQuery.isError ? (
          <div className="p-8">
            <AppErrorBanner
              detail="Could not load stock levels for the selected filters."
              error={stockQuery.error}
              onRetry={() => void stockQuery.refetch()}
              title="Unable to load stock levels"
            />
          </div>
        ) : (
          <AppDataTable
            columns={columns}
            data={stockQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "No stock matches the selected filters."
                : "No stock has been entered or dispatched in transit yet."
            }
            emptyTitle="No stock data"
            getRowId={(row) => `${row.locationSlug}:${row.skuId}`}
          />
        )}
      </AppTableWrapper>

      <StockCountDialog
        error={countMutation.error}
        isPending={countMutation.isPending}
        locationName={getStockBalanceLocationName(
          filter.locationSlug,
          stockQuery.data?.locationName,
          locationsQuery.data?.items,
        )}
        locationSlug={filter.locationSlug}
        onOpenChange={(open) => {
          setCountOpen(open);
          if (!open) countMutation.reset();
        }}
        onSubmit={(req) => countMutation.mutate(req)}
        open={countOpen}
        row={countTarget}
      />
    </PageShell>
  );
}
