"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import {
  getStockBalanceLocationName,
  STOCK_BALANCE_LOCATIONS_QUERY,
} from "@/app/admin/stock/balances/page.support";
import { formatAdminStockResultLabel } from "@/components/admin/stock/admin-stock-filter-panel";
import { StockMovementFilterPanel } from "@/components/stock/stock-movement-filter-panel";
import {
  hasStockMovementFilter,
  STOCK_MOVEMENT_DEFAULT_FILTER,
  type StockMovementFilter,
} from "@/components/stock/stock-movement-history.support";
import { StockMovementResults } from "@/components/stock/stock-movement-results";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import {
  adminLocationsQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import {
  adminStockMovementsQueryKey,
  fetchAdminStockMovements,
} from "@/lib/react-query/stock-movements";

export function StockMovementsPageClient() {
  const filterId = useId();
  const [draftFilter, setDraftFilter] = useState<StockMovementFilter>(
    STOCK_MOVEMENT_DEFAULT_FILTER,
  );
  const [filter, setFilter] = useState<StockMovementFilter>(
    STOCK_MOVEMENT_DEFAULT_FILTER,
  );
  const hasFilters = hasStockMovementFilter(filter);

  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(STOCK_BALANCE_LOCATIONS_QUERY),
    queryKey: adminLocationsQueryKey(STOCK_BALANCE_LOCATIONS_QUERY),
    staleTime: 60_000,
  });
  const movementsQuery = useQuery({
    queryFn: () => fetchAdminStockMovements(filter),
    queryKey: adminStockMovementsQueryKey(filter),
  });

  function updateDraft(patch: Partial<StockMovementFilter>) {
    setDraftFilter((current) => ({ ...current, ...patch, page: 1 }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFilter({ ...draftFilter, page: 1, q: draftFilter.q.trim() });
  }

  function handleClear() {
    setDraftFilter(STOCK_MOVEMENT_DEFAULT_FILTER);
    setFilter(STOCK_MOVEMENT_DEFAULT_FILTER);
  }

  return (
    <PageShell>
      <PageHeader
        description="Audit stock changes across locations, SKUs, sources, and receipt references."
        title="Stock movements"
      />

      <StockMovementFilterPanel
        draftFilter={draftFilter}
        filterId={filterId}
        hasFilters={hasFilters}
        locations={locationsQuery.data?.items ?? []}
        locationsLoading={locationsQuery.isPending}
        onClear={handleClear}
        onSubmit={handleSubmit}
        resultLabel={
          movementsQuery.data
            ? formatAdminStockResultLabel({
                count: movementsQuery.data.totalCount,
                emptyLabel: "movement",
                locationName:
                  filter.locationSlug && movementsQuery.data.locationName
                    ? getStockBalanceLocationName(
                        filter.locationSlug,
                        movementsQuery.data.locationName,
                        locationsQuery.data?.items,
                      )
                    : null,
              })
            : undefined
        }
        updateDraft={updateDraft}
      />

      <StockMovementResults
        data={movementsQuery.data}
        emptyDescription={
          hasFilters
            ? "No stock movements match the selected filters."
            : "No stock movements have been recorded yet."
        }
        emptyTitle="No movements"
        error={movementsQuery.error}
        isError={movementsQuery.isError}
        isLoading={movementsQuery.isFetching && !movementsQuery.data}
        onPageChange={(page) => setFilter((current) => ({ ...current, page }))}
        onPageSizeChange={(pageSize) =>
          setFilter((current) => ({ ...current, page: 1, pageSize }))
        }
        onRetry={() => void movementsQuery.refetch()}
        page={filter.page}
        pageSize={filter.pageSize}
      />
    </PageShell>
  );
}
