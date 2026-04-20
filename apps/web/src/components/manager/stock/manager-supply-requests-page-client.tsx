"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerIncomingSupplyRequests,
  managerIncomingSupplyRequestsQueryKey,
} from "@/lib/react-query/stock-supply";
import { ActionDialog } from "./manager-supply-request-action-dialog";
import { IncomingRequestList } from "./manager-supply-request-list";
import {
  filterSupplyRequests,
  getSupplyRequestCounts,
  type RequestFilter,
  type ResolveTarget,
  type ViewMode,
} from "./manager-supply-requests.support";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function ManagerSupplyRequestsPageClient() {
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.supply.manage");

  const query = {
    page: 1,
    pageSize: 50,
    sourceLocationId: selectedLocationScope?.locationId ?? "",
  };
  const requestsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchManagerIncomingSupplyRequests({
        page: 1,
        pageSize: 50,
        sourceLocationId: selectedLocationScope!.locationId,
      }),
    queryKey: managerIncomingSupplyRequestsQueryKey(query),
    staleTime: 30_000,
  });
  const allItems = requestsQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () => filterSupplyRequests(allItems, statusFilter, search),
    [allItems, search, statusFilter],
  );
  const counts = useMemo(() => getSupplyRequestCounts(allItems), [allItems]);

  return (
    <PageShell>
      <PageHeader
        description="Review and action stock supply requests directed to this location."
        title="Incoming supply requests"
      />
      <LocationScopePanel
        description="Supply requests show for the location you manage as a source."
        emptyDescription="No location is available for supply request management."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Location"
      />
      <RequestContent
        allItems={allItems}
        counts={counts}
        filteredItems={filteredItems}
        isSelected={!!selectedLocationScope}
        onAction={(action, item) => setResolveTarget({ action, item })}
        onRetry={() => void requestsQuery.refetch()}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onViewModeChange={setViewMode}
        queryError={requestsQuery.error}
        queryState={requestsQuery.status}
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />
      <ActionDialog
        onOpenChange={(open) => {
          if (!open) setResolveTarget(null);
        }}
        onSuccess={() => {
          void requestsQuery.refetch();
          setResolveTarget(null);
        }}
        open={!!resolveTarget}
        target={resolveTarget}
      />
    </PageShell>
  );
}

function RequestContent({
  allItems,
  counts,
  filteredItems,
  isSelected,
  onAction,
  onRetry,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  queryError,
  queryState,
  search,
  statusFilter,
  viewMode,
}: {
  allItems: Parameters<typeof IncomingRequestList>[0]["allItems"];
  counts: Parameters<typeof IncomingRequestList>[0]["counts"];
  filteredItems: Parameters<typeof IncomingRequestList>[0]["filteredItems"];
  isSelected: boolean;
  onAction: Parameters<typeof IncomingRequestList>[0]["onAction"];
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: RequestFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
  search: string;
  statusFilter: RequestFilter;
  viewMode: ViewMode;
}) {
  if (queryState === "pending" && isSelected) return <SupplyRequestSkeleton />;
  if (queryState === "error") {
    return (
      <AppErrorBanner
        detail="Could not load supply requests."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load requests"
      />
    );
  }
  if (!isSelected) return null;

  return (
    <IncomingRequestList
      allItems={allItems}
      counts={counts}
      filteredItems={filteredItems}
      onAction={onAction}
      onSearchChange={onSearchChange}
      onStatusFilterChange={onStatusFilterChange}
      onViewModeChange={onViewModeChange}
      search={search}
      statusFilter={statusFilter}
      viewMode={viewMode}
    />
  );
}

function SupplyRequestSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {SKELETON_KEYS.map((key) => (
        <Skeleton className="h-44 w-full rounded-xl" key={key} />
      ))}
    </div>
  );
}
