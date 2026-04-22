"use client";

import type { AdminReservationSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { reservationColumns } from "@/components/admin/stock/reservation-columns";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerReservations,
  managerReservationsQueryKey,
} from "@/lib/react-query/stock-admin";

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6];

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

      {selectedLocationScope ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={handleSearch}
        >
          <Input
            className="max-w-xs"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product or SKU"
            value={search}
          />
          <Button size="sm" type="submit">
            <Search data-icon="inline-start" />
            Search
          </Button>
          {activeSearch ? (
            <Button
              onClick={() => {
                setSearch("");
                setActiveSearch("");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <X data-icon="inline-start" />
              Clear
            </Button>
          ) : null}
        </form>
      ) : null}

      {reservationsQuery.data ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {reservationsQuery.data.items.length} active reservation
          {reservationsQuery.data.items.length !== 1 ? "s" : ""}
          {reservationsQuery.data.locationName
            ? ` at ${reservationsQuery.data.locationName}`
            : ""}
        </p>
      ) : null}

      {reservationsQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : reservationsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load reservations for this location."
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
    </PageShell>
  );
}
