"use client";

import type { AdminReservationSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { reservationColumns } from "@/components/admin/stock/reservation-columns";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { StockSearchToolbar } from "@/components/stock/stock-workspace-panels";
import { AppErrorBanner } from "@/components/system/app-error";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { formatCount } from "@/lib/display/format";
import {
  fetchManagerReservations,
  managerReservationsQueryKey,
} from "@/lib/react-query/stock-admin";

export function ManagerReservationsPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.view");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const query = {
    limit: 50,
    locationId: selectedLocationScope?.locationId ?? "",
    q: activeSearch,
  };
  const reservationsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchManagerReservations(query),
    queryKey: managerReservationsQueryKey(selectedLocationScope ? query : {}),
    staleTime: 30_000,
  });

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setActiveSearch(search.trim());
  }

  return (
    <PageShell>
      <PageHeader
        description="Active reservations reducing availability at the selected managed location."
        title="Reservations"
      />

      <LocationScopePanel
        description="Reservation visibility follows the location scopes linked to your manager access."
        emptyDescription="No managed location is available for reservation visibility."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedLocationSlug(slug);
          setSearch("");
          setActiveSearch("");
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      <div className="flex flex-col gap-6">
        {selectedLocationScope && (
          <StockSearchToolbar
            activeSearch={activeSearch}
            countLabel={`${formatCount(reservationsQuery.data?.items.length ?? 0)} active`}
            onClear={() => {
              setSearch("");
              setActiveSearch("");
            }}
            onSearchChange={setSearch}
            onSubmit={handleSearch}
            placeholder="Search reservations by product or SKU"
            search={search}
          />
        )}

        <AppTableWrapper>
          {reservationsQuery.isPending && selectedLocationScope ? (
            <StockWorkspaceTableSkeleton />
          ) : reservationsQuery.isError ? (
            <div className="p-8">
              <AppErrorBanner
                detail="Could not load reservations for this location."
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
                selectedLocationScope
                  ? "No active reservations are reducing stock at this location."
                  : "Select a location above to load reservations."
              }
              emptyTitle="No reservations"
              getRowId={(row: AdminReservationSummary) =>
                `${row.locationSlug}:${row.skuId}:${row.sourceKey}`
              }
            />
          )}
        </AppTableWrapper>
      </div>
    </PageShell>
  );
}
