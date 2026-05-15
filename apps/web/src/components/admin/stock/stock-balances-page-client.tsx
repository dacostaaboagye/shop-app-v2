"use client";

import type { AdminStockBalanceSummary } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { OpeningStockSetupWorkspace } from "@/components/admin/stock/opening-stock-setup-workspace";
import { buildStockBalanceColumns } from "@/components/admin/stock/stock-balance-columns";
import { StockBalanceTableSection } from "@/components/admin/stock/stock-balance-table-section";
import { StockCountDialog } from "@/components/admin/stock/stock-count-dialog";
import { StockCountWorkspace } from "@/components/admin/stock/stock-count-workspace";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { useStockWriteOffDialog } from "@/components/stock/use-stock-write-off-dialog";
import { AppBanner } from "@/components/system/app-banner";
import { PageHeader, PageShell } from "@/components/system/page-shell";
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
  postOpeningStock,
  postStockCount,
  stockBalancesQueryKey,
} from "@/lib/react-query/stock-admin";
import { postAdminStockWriteOff } from "@/lib/react-query/stock-write-offs";

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
  const [openingResetKey, setOpeningResetKey] = useState(0);

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
  const openingStockMutation = useMutation({
    mutationFn: postOpeningStock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stock", "balances"] });
      setOpeningResetKey((key) => key + 1);
    },
  });
  const { openWriteOffDialog, writeOffDialog } = useStockWriteOffDialog({
    invalidateQueryKeys: [
      ["stock", "balances"],
      ["stock", "movements"],
    ],
    locationSlug: filter.locationSlug,
    mutationFn: postAdminStockWriteOff,
  });

  const columns = buildStockBalanceColumns(
    canCount && filter.locationSlug ? openCountDialog : null,
    canCount && filter.locationSlug ? openWriteOffDialog : null,
  );

  function openCountDialog(row: AdminStockBalanceSummary | null) {
    setCountTarget(row);
    countMutation.reset();
    setCountOpen(true);
  }

  return (
    <PageShell>
      <PageHeader
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
        onClear={() => {
          openingStockMutation.reset();
          handleClear();
        }}
        onSubmit={(event) => {
          openingStockMutation.reset();
          handleSubmit(event);
        }}
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

      {canCount && filter.locationSlug ? (
        <>
          <OpeningStockSetupWorkspace
            error={openingStockMutation.error}
            isPending={openingStockMutation.isPending}
            key={`${filter.locationSlug}:${openingResetKey}`}
            lookup={{ locationSlug: filter.locationSlug, type: "admin" }}
            locationName={getStockBalanceLocationName(
              filter.locationSlug,
              stockQuery.data?.locationName,
              locationsQuery.data?.items,
            )}
            locationSlug={filter.locationSlug}
            onSubmit={(req) => {
              openingStockMutation.reset();
              openingStockMutation.mutate(req);
            }}
            successMessage={
              openingStockMutation.data
                ? `${openingStockMutation.data.initializedCount} SKU baseline(s) were initialized for ${openingStockMutation.data.locationName}.`
                : null
            }
          />
          <StockCountWorkspace
            error={countMutation.error}
            isPending={countMutation.isPending}
            locationName={getStockBalanceLocationName(
              filter.locationSlug,
              stockQuery.data?.locationName,
              locationsQuery.data?.items,
            )}
            locationSlug={filter.locationSlug}
            onSubmit={(req) => {
              countMutation.reset();
              countMutation.mutate(req);
            }}
          />
        </>
      ) : null}
      {canCount && !filter.locationSlug ? (
        <AppBanner
          description="Opening stock and stock counts are location-specific. Choose a location above to prepare or correct quantities."
          title="Select a location to manage stock"
          tone="info"
        />
      ) : null}

      <StockBalanceTableSection
        columns={columns}
        data={stockQuery.data}
        error={stockQuery.error}
        hasFilters={hasFilters}
        isError={stockQuery.isError}
        isFetching={stockQuery.isFetching}
        onRetry={() => void stockQuery.refetch()}
      />

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
        onSubmit={(req) => {
          countMutation.reset();
          countMutation.mutate(req);
        }}
        open={countOpen}
        row={countTarget}
      />
      {writeOffDialog}
    </PageShell>
  );
}
