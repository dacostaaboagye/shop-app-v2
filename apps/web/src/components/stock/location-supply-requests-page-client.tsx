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
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
import {
  fetchManagerSupplyRequests,
  managerSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";

type LocationSupplyRequestsPageClientProps = {
  emptyLocationDescription: string;
  locationPanelDescription: string;
  locationPanelTitle: string;
  pageDescription: string;
  pageTitle: string;
};

export function LocationSupplyRequestsPageClient({
  emptyLocationDescription,
  locationPanelDescription,
  locationPanelTitle,
  pageDescription,
  pageTitle,
}: LocationSupplyRequestsPageClientProps) {
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
  } = useActiveLocationScope("stock.supply.manage");

  const query = useMemo(() => {
    if (!selectedLocationScope) {
      return null;
    }

    return {
      locationId: selectedLocationScope.locationId,
      page: 1,
      pageSize: 50,
    };
  }, [selectedLocationScope]);

  const requestsQuery = useQuery({
    enabled: !isLoading && query !== null,
    queryFn: () => {
      if (!query) {
        throw new Error("Supply request query requires a selected location.");
      }

      return fetchManagerSupplyRequests(query);
    },
    queryKey: query
      ? managerSupplyRequestsQueryKey(query)
      : ["supply-requests", "manager-location", "missing-location"],
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
    if (!query) {
      return;
    }

    void queryClient.refetchQueries({
      queryKey: managerSupplyRequestsQueryKey(query),
    });
  }

  function handleSuccess() {
    handleRetry();
    setResolveTarget(null);
  }

  return (
    <PageShell>
      <PageHeader description={pageDescription} title={pageTitle} />

      <LocationScopePanel
        description={locationPanelDescription}
        emptyDescription={emptyLocationDescription}
        isLoading={isLoading}
        label="Active location"
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title={locationPanelTitle}
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
