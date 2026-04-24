"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManagerSupplyRequests,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { ActionDialog } from "./manager-supply-request-action-dialog";
import {
  filterSupplyRequests,
  getSupplyRequestCounts,
  type RequestFilter,
  type ResolveTarget,
  type ViewMode,
} from "./manager-supply-requests.support";
import {
  LocationFilterChips,
  RequestContent,
} from "./manager-supply-requests-page-sections";

export function ManagerSupplyRequestsPageClient() {
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const queryClient = useQueryClient();
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScopeOptional("stock.supply.manage");

  // Fetch requests for all accessible locations in parallel.
  // When a single location is selected we still use the same parallel
  // structure but with a single-element array so the merge logic is uniform.
  const targetScopes = selectedLocationScope
    ? [selectedLocationScope]
    : accessibleLocationScopes;

  const locationQueries = useQueries({
    queries: targetScopes.map((scope) => {
      const query = {
        locationId: scope.locationId,
        page: 1,
        pageSize: 50,
      };
      return {
        enabled: !isLoading && accessibleLocationScopes.length > 0,
        queryFn: () => fetchManagerSupplyRequests(query),
        queryKey: managerSupplyRequestsQueryKey(query),
        staleTime: 30_000,
      };
    }),
  });

  const anyLoading = locationQueries.some((q) => q.status === "pending");
  const anyError = locationQueries.find((q) => q.status === "error");
  const allItems = useMemo(
    () =>
      locationQueries
        .flatMap((q) => q.data?.items ?? [])
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationQueries.flatMap],
  );
  const filteredItems = useMemo(
    () => filterSupplyRequests(allItems, statusFilter, search),
    [allItems, search, statusFilter],
  );
  const counts = useMemo(() => getSupplyRequestCounts(allItems), [allItems]);
  const manageableLocationIds = useMemo(
    () => accessibleLocationScopes.map((scope) => scope.locationId),
    [accessibleLocationScopes],
  );

  function handleRetry() {
    for (const scope of targetScopes) {
      void queryClient.refetchQueries({
        queryKey: managerSupplyRequestsQueryKey({
          locationId: scope.locationId,
          page: 1,
          pageSize: 50,
        }),
      });
    }
  }

  function handleSuccess() {
    handleRetry();
    setResolveTarget(null);
  }

  const hasLocations = accessibleLocationScopes.length > 0;
  const isMultiLocation = accessibleLocationScopes.length > 1;

  return (
    <PageShell>
      <PageHeader
        description={
          isMultiLocation
            ? "Review supply requests across all your managed locations. Select a location to approve, reject, or dispatch individual requests."
            : "Review stock requests created for this location and action requests your location must fulfill."
        }
        title="Location supply requests"
      />

      {isMultiLocation && !isLoading && (
        <LocationFilterChips
          locationScopes={accessibleLocationScopes}
          onLocationChange={setSelectedLocationSlug}
          selectedLocationSlug={selectedLocationSlug}
        />
      )}

      <RequestContent
        allItems={allItems}
        counts={counts}
        filteredItems={filteredItems}
        hasLocations={hasLocations}
        isLoading={isLoading || (anyLoading && allItems.length === 0)}
        manageableLocationIds={manageableLocationIds}
        onAction={(action, item) => setResolveTarget({ action, item })}
        onRetry={handleRetry}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onViewModeChange={setViewMode}
        queryError={anyError?.error ?? null}
        queryState={
          anyError && allItems.length === 0
            ? "error"
            : anyLoading && allItems.length === 0
              ? "pending"
              : "success"
        }
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />

      <ActionDialog
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null);
        }}
        onSuccess={handleSuccess}
        open={!!resolveTarget}
        target={resolveTarget}
      />
    </PageShell>
  );
}
