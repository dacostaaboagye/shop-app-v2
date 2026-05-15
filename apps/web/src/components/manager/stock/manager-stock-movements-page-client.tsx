"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { StockMovementFilterPanel } from "@/components/stock/stock-movement-filter-panel";
import {
  hasStockMovementFilter,
  STOCK_MOVEMENT_DEFAULT_FILTER,
  type StockMovementFilter,
  toManagerMovementQuery,
} from "@/components/stock/stock-movement-history.support";
import { StockMovementResults } from "@/components/stock/stock-movement-results";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { formatCount } from "@/lib/display/format";
import {
  fetchManagerStockMovements,
  managerStockMovementsQueryKey,
} from "@/lib/react-query/stock-movements";

export function ManagerStockMovementsPageClient() {
  const filterId = useId();
  const searchParams = useSearchParams();
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.view");
  const [draftFilter, setDraftFilter] = useState<StockMovementFilter>(() =>
    initialMovementFilter(searchParams),
  );
  const [filter, setFilter] = useState<StockMovementFilter>(() =>
    initialMovementFilter(searchParams),
  );
  const query = selectedLocationScope
    ? toManagerMovementQuery(filter, selectedLocationScope.locationSlug)
    : null;

  const movementsQuery = useQuery({
    enabled: !!query,
    queryFn: () => {
      if (!query) throw new Error("A managed location is required.");
      return fetchManagerStockMovements(query);
    },
    queryKey: managerStockMovementsQueryKey(query ?? {}),
    staleTime: 30_000,
  });
  const hasFilters = hasStockMovementFilter(filter);

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
        description="Trace stock changes for a managed location without exposing internal ledger keys."
        title="Stock movements"
      />

      <LocationScopePanel
        description="Movement visibility follows the location scopes linked to your manager access."
        emptyDescription="No managed location is available for movement history."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedLocationSlug(slug);
          handleClear();
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      {selectedLocationScope ? (
        <StockMovementFilterPanel
          draftFilter={draftFilter}
          filterId={filterId}
          hasFilters={hasFilters}
          locationLocked
          onClear={handleClear}
          onSubmit={handleSubmit}
          resultLabel={
            movementsQuery.data
              ? `${formatCount(movementsQuery.data.totalCount)} movement${
                  movementsQuery.data.totalCount === 1 ? "" : "s"
                } at ${selectedLocationScope.locationName}`
              : undefined
          }
          updateDraft={updateDraft}
        />
      ) : null}

      <StockMovementResults
        data={movementsQuery.data}
        emptyDescription={
          selectedLocationScope
            ? "No stock movements match this location and filter set."
            : "Select a location above to load movement history."
        }
        emptyTitle="No movements"
        error={movementsQuery.error}
        isError={movementsQuery.isError}
        isLoading={movementsQuery.isPending && !!selectedLocationScope}
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

function initialMovementFilter(searchParams: {
  get(name: string): string | null;
}) {
  return {
    ...STOCK_MOVEMENT_DEFAULT_FILTER,
    sku: searchParams.get("sku")?.trim() ?? "",
  };
}
