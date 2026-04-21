"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useId } from "react";
import { reservationColumns } from "@/components/admin/stock/reservation-columns";
import { StockFilterSelect } from "@/components/admin/stock/stock-filter-select";
import { AppDataTable } from "@/components/data-table/app-data-table";
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
  adminReservationsQueryKey,
  fetchAdminReservations,
} from "@/lib/react-query/stock-admin";
import {
  STOCK_BALANCE_LOCATIONS_QUERY,
  STOCK_BALANCE_SKELETON_KEYS,
  STOCK_CATALOG_FILTER_QUERY,
  useStockBalanceFilter,
} from "../balances/page.support";

export default function ActiveReservationsPage() {
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

      {reservationsQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {reservationsQuery.data.items.length} active reservation
          {reservationsQuery.data.items.length !== 1 ? "s" : ""}
          {filter.locationSlug && reservationsQuery.data.locationName
            ? ` at ${reservationsQuery.data.locationName}`
            : " across all locations"}
        </p>
      ) : null}

      {reservationsQuery.isFetching && !reservationsQuery.data ? (
        <div className="flex flex-col gap-2">
          {STOCK_BALANCE_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : reservationsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load reservations for the selected filters."
          error={reservationsQuery.error}
          onRetry={() => void reservationsQuery.refetch()}
          title="Unable to load reservations"
        />
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
    </PageShell>
  );
}
