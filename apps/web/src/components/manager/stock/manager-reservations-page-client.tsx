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

      <div className="flex flex-col gap-6">
        {selectedLocationScope && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
            <form
              className="flex items-center gap-3 flex-1 min-w-[300px]"
              onSubmit={handleSearch}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  className="h-11 border-border/60 bg-muted/20 pl-11 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl placeholder:text-muted-foreground/40 font-medium"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reservations by product or SKU..."
                  value={search}
                />
              </div>
              <Button className="h-11 rounded-xl px-6 font-bold" type="submit">
                Search
              </Button>
              {activeSearch ? (
                <Button
                  onClick={() => {
                    setSearch("");
                    setActiveSearch("");
                  }}
                  className="h-11 rounded-xl px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                  type="button"
                  variant="ghost"
                >
                  <X className="mr-2 size-4" aria-hidden="true" />
                  Clear
                </Button>
              ) : null}
            </form>

            <div className="ml-auto flex items-center gap-4 pr-2">
              <div className="h-4 w-px bg-border/60" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 tabular-nums">
                {reservationsQuery.data?.items.length ?? 0} active
              </span>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-border/50">
          {reservationsQuery.isPending && selectedLocationScope ? (
            <div className="flex flex-col gap-1 p-4">
              {SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-12 w-full rounded-lg" />
              ))}
            </div>
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
        </div>
      </div>
    </PageShell>
  );
}
