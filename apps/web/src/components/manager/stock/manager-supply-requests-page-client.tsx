"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/components/manager/stock/manager-supply-request-action-dialog";
import {
  filterSupplyRequests,
  getSupplyRequestCounts,
  type RequestFilter,
  type ResolveTarget,
  type ViewMode,
} from "@/components/manager/stock/manager-supply-requests.support";
import { RequestContent } from "@/components/manager/stock/manager-supply-requests-page-sections";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScopeOptional } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManagerIncomingSupplyRequests,
  fetchManagerSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

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

  const selectedLocationQuery = useMemo(
    () =>
      selectedLocationScope
        ? {
            locationId: selectedLocationScope.locationId,
            page: 1,
            pageSize: 50,
          }
        : null,
    [selectedLocationScope],
  );
  const inboxQuery = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
    }),
    [],
  );

  const requestsQuery = useQuery({
    enabled: !isLoading,
    queryFn: () =>
      selectedLocationQuery
        ? fetchManagerSupplyRequests(selectedLocationQuery)
        : fetchManagerIncomingSupplyRequests(inboxQuery),
    queryKey: selectedLocationQuery
      ? managerSupplyRequestsQueryKey(selectedLocationQuery)
      : managerIncomingSupplyRequestsQueryKey(inboxQuery),
    staleTime: 30_000,
  });

  const allItems = requestsQuery.data?.items ?? [];
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
    void queryClient.refetchQueries({
      queryKey: selectedLocationQuery
        ? managerSupplyRequestsQueryKey(selectedLocationQuery)
        : managerIncomingSupplyRequestsQueryKey(inboxQuery),
    });
  }

  function handleSuccess() {
    handleRetry();
    setResolveTarget(null);
  }

  return (
    <PageShell>
      <PageHeader
        description="Use the all-location inbox to review requests waiting on your managed source locations, or switch to one location to see every request tied to that location."
        title="Supply requests"
      />

      <LocationScopePanel
        allOptionLabel="All managed locations"
        description="All managed locations shows requests waiting on your source locations. Selecting one location shows every request tied to that location, including requests that location issued."
        emptyDescription="Assign a managed location before reviewing supply requests."
        isLoading={isLoading}
        label="Operating view"
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Operations inbox"
      />

      <RequestContent
        allItems={allItems}
        counts={counts}
        filteredItems={filteredItems}
        hasLocations={accessibleLocationScopes.length > 0}
        isLoading={isLoading || requestsQuery.isPending}
        locationName={selectedLocationScope?.locationName ?? null}
        manageableLocationIds={manageableLocationIds}
        onAction={(action, item) => setResolveTarget({ action, item })}
        onRetry={handleRetry}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onViewModeChange={setViewMode}
        queryError={requestsQuery.error ?? null}
        queryState={
          requestsQuery.isError
            ? "error"
            : requestsQuery.isPending
              ? "pending"
              : "success"
        }
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />

      <ActionDialog
        onOpenChange={(open) => {
          if (!open) {
            setResolveTarget(null);
          }
        }}
        onSuccess={handleSuccess}
        open={!!resolveTarget}
        target={resolveTarget}
      />
    </PageShell>
  );
}
