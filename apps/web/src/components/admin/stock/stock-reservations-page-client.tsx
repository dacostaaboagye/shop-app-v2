"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import {
  STOCK_BALANCE_LOCATIONS_QUERY,
  STOCK_CATALOG_FILTER_QUERY,
  useStockBalanceFilter,
} from "@/app/admin/stock/balances/page.support";
import {
  AdminStockFilterPanel,
  formatAdminStockResultLabel,
} from "@/components/admin/stock/admin-stock-filter-panel";
import { reservationColumns } from "@/components/admin/stock/reservation-columns";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
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
  adminReservationsQueryKey,
  fetchAdminReservations,
} from "@/lib/react-query/stock-admin";

export function StockReservationsPageClient() {
  const filterId = useId();
  const {
    draftFilter,
    filter,
    handleClear,
    handleSubmit,
    hasFilters,
    updateDraft,
  } = useStockBalanceFilter();

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
  const reservationsQuery = useQuery({
    queryFn: () => fetchAdminReservations({ ...filter, limit: 50 }),
    queryKey: adminReservationsQueryKey({ ...filter, limit: 50 }),
  });

  return (
    <PageShell>
      <PageHeader
        description="Active reservations across inventory, with optional location, brand, and category filters."
        title="Reservations"
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
          reservationsQuery.data
            ? formatAdminStockResultLabel({
                count: reservationsQuery.data.items.length,
                emptyLabel: "active reservation",
                locationName:
                  filter.locationSlug && reservationsQuery.data.locationName
                    ? reservationsQuery.data.locationName
                    : null,
              })
            : undefined
        }
        updateDraft={updateDraft}
      />

      <AppTableWrapper>
        {reservationsQuery.isFetching && !reservationsQuery.data ? (
          <StockWorkspaceTableSkeleton
            keys={["sb-1", "sb-2", "sb-3", "sb-4", "sb-5"]}
            rowClassName="h-12 w-full rounded-lg"
          />
        ) : reservationsQuery.isError ? (
          <div className="p-8">
            <AppErrorBanner
              detail="Could not load reservations for the selected filters."
              error={reservationsQuery.error}
              onRetry={() => void reservationsQuery.refetch()}
              title="Unable to load reservations"
            />
          </div>
        ) : (
          <AppDataTable
            columns={reservationColumns}
            data={reservationsQuery.data?.items ?? []}
            density="compact"
            emptyDescription={
              hasFilters
                ? "No active reservations match the selected filters."
                : "There are no active reservations across inventory."
            }
            emptyTitle="No reservations"
            getRowId={(row) =>
              `${row.locationSlug}:${row.skuId}:${row.sourceKey}`
            }
          />
        )}
      </AppTableWrapper>
    </PageShell>
  );
}
