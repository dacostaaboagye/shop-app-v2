"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Search, X } from "lucide-react";
import { useId, useState } from "react";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { StockFilterSelect } from "@/components/admin/stock/stock-filter-select";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  getStockBalanceLocationName,
  STOCK_BALANCE_LOCATIONS_QUERY,
  STOCK_BALANCE_SKELETON_KEYS,
  STOCK_CATALOG_FILTER_QUERY,
  useStockBalanceFilter,
} from "./page.support";

export default function StockBalancesPage() {
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
      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
        onSubmit={handleSubmit}
      >
        <StockFilterSelect
          id={`${filterId}-location`}
          isLoading={locationsQuery.isPending}
          label="Location"
          loadingLabel="Loading locations..."
          onChange={(locationSlug) => updateDraft({ locationSlug })}
          options={locationsQuery.data?.items ?? []}
          placeholder="All locations"
          value={draftFilter.locationSlug}
        />
        <StockFilterSelect
          id={`${filterId}-brand`}
          isLoading={brandsQuery.isPending}
          label="Brand"
          loadingLabel="Loading brands..."
          onChange={(brandSlug) => updateDraft({ brandSlug })}
          options={brandsQuery.data?.items ?? []}
          placeholder="All brands"
          value={draftFilter.brandSlug}
        />
        <StockFilterSelect
          id={`${filterId}-category`}
          isLoading={categoriesQuery.isPending}
          label="Category"
          loadingLabel="Loading categories..."
          onChange={(categorySlug) => updateDraft({ categorySlug })}
          options={categoriesQuery.data?.items ?? []}
          placeholder="All categories"
          value={draftFilter.categorySlug}
        />
        <div className="flex min-w-52 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${filterId}-search`}>Search</Label>
          <Input
            id={`${filterId}-search`}
            onChange={(event) => updateDraft({ q: event.target.value })}
            placeholder="Product name or SKU"
            value={draftFilter.q}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit">
            <Search data-icon="inline-start" />
            Query
          </Button>
          {hasFilters ? (
            <Button
              onClick={handleClear}
              size="sm"
              type="button"
              variant="outline"
            >
              <X data-icon="inline-start" />
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {stockQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {stockQuery.data.totalCount} SKU
          {stockQuery.data.totalCount !== 1 ? "s" : ""}
          {filter.locationSlug && stockQuery.data.locationName
            ? ` at ${stockQuery.data.locationName}`
            : " across all locations"}
        </p>
      ) : null}

      {stockQuery.isFetching && !stockQuery.data ? (
        <div className="flex flex-col gap-2">
          {STOCK_BALANCE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : stockQuery.isError ? (
        <AppErrorBanner
          detail="Could not load stock levels for the selected filters."
          error={stockQuery.error}
          onRetry={() => void stockQuery.refetch()}
          title="Unable to load stock levels"
        />
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
