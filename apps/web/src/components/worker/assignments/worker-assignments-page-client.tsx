"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplyRequestDialog } from "@/components/worker/stock/supply-request-dialog";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { AssignmentList } from "./worker-assignment-list";
import {
  filterAssignments,
  getAssignmentCounts,
  type StockFilter,
  type SupplyTarget,
  type ViewMode,
} from "./worker-assignments-support";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function WorkerAssignmentsPageClient() {
  const [supplyTarget, setSupplyTarget] = useState<SupplyTarget | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.own.view");

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("An assignment location is required.");
      }
      return fetchWorkerAssignments(selectedLocationScope.locationId);
    },
    queryKey: workerAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });

  const allItems = assignmentsQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () => filterAssignments({ items: allItems, search, stockFilter }),
    [allItems, search, stockFilter],
  );
  const counts = useMemo(() => getAssignmentCounts(allItems), [allItems]);

  return (
    <PageShell>
      <PageHeader
        description="Product variants currently assigned to you at your location."
        title="My assignments"
      />

      <LocationScopePanel
        description="Assignments load from the location scope already attached to your access."
        emptyDescription="No assigned location is available for your worker assignment view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Assignment location"
      />

      {assignmentsQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-3">
          {SKELETON_KEYS.map((key) => (
            <Skeleton className="h-40 w-full rounded-xl" key={key} />
          ))}
        </div>
      ) : assignmentsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your assignments. Check the location ID and try again."
          error={assignmentsQuery.error}
          onRetry={() => void assignmentsQuery.refetch()}
          title="Unable to load assignments"
        />
      ) : selectedLocationScope ? (
        <AssignmentList
          allItems={allItems}
          counts={counts}
          filteredItems={filteredItems}
          locationId={selectedLocationScope.locationId}
          locationName={
            assignmentsQuery.data?.locationName ??
            selectedLocationScope.locationName
          }
          onRequestSupply={setSupplyTarget}
          onSearchChange={setSearch}
          onStockFilterChange={setStockFilter}
          onViewModeChange={setViewMode}
          search={search}
          stockFilter={stockFilter}
          viewMode={viewMode}
        />
      ) : null}

      <SupplyRequestDialog
        onOpenChange={(open) => {
          if (!open) setSupplyTarget(null);
        }}
        open={!!supplyTarget}
        target={supplyTarget}
      />
    </PageShell>
  );
}
