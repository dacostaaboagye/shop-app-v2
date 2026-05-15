"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkSupplyRequestDialog } from "@/components/worker/stock/bulk-supply-request-dialog";
import { SupplyRequestDialog } from "@/components/worker/stock/supply-request-dialog";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerAssignments,
  workerAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import { AssignmentList } from "./worker-assignment-list";
import {
  filterAssignments,
  getAssignmentCounts,
  type StockFilter,
  type SupplyTarget,
  toggleSupplySelection,
  toSupplyTarget,
  type ViewMode,
} from "./worker-assignments-support";
import { WorkerHandoverDialog } from "./worker-handover-dialog";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function WorkerAssignmentsPageClient() {
  const [bulkRequestOpen, setBulkRequestOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] =
    useState<CurrentAssignment | null>(null);
  const [selectedSupplySkuIds, setSelectedSupplySkuIds] = useState<string[]>(
    [],
  );
  const [supplyTarget, setSupplyTarget] = useState<SupplyTarget | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const router = useRouter();

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
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  const allItems = assignmentsQuery.data?.items ?? [];
  const selectedSupplyTargets = useMemo(
    () =>
      allItems
        .filter((item) => selectedSupplySkuIds.includes(item.skuId))
        .map((item) =>
          toSupplyTarget({
            item,
            locationId: selectedLocationScope?.locationId ?? "",
            locationName:
              assignmentsQuery.data?.locationName ??
              selectedLocationScope?.locationName ??
              "Assigned location",
          }),
        ),
    [
      allItems,
      assignmentsQuery.data?.locationName,
      selectedLocationScope?.locationId,
      selectedLocationScope?.locationName,
      selectedSupplySkuIds,
    ],
  );
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
        onLocationChange={(slug) => {
          setSelectedSupplySkuIds([]);
          setSelectedLocationSlug(slug);
        }}
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
          moneyProfile={moneyProfile}
          onBulkRequestSupply={() => setBulkRequestOpen(true)}
          onClearSelectedSupply={() => setSelectedSupplySkuIds([])}
          onRequestSupply={setSupplyTarget}
          onSearchChange={setSearch}
          onSelectSupply={(target) =>
            setSelectedSupplySkuIds((current) =>
              toggleSupplySelection(current, target.skuId),
            )
          }
          onStartHandover={setHandoverTarget}
          onStockFilterChange={setStockFilter}
          onViewModeChange={setViewMode}
          search={search}
          selectedSupplySkuIds={selectedSupplySkuIds}
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
      <BulkSupplyRequestDialog
        onOpenChange={(open) => {
          setBulkRequestOpen(open);
          if (!open) {
            setSelectedSupplySkuIds([]);
          }
        }}
        open={bulkRequestOpen}
        targets={selectedSupplyTargets}
      />
      <WorkerHandoverDialog
        locationName={
          assignmentsQuery.data?.locationName ??
          selectedLocationScope?.locationName ??
          "Assigned location"
        }
        onOpenChange={(open) => {
          if (!open) {
            setHandoverTarget(null);
          }
        }}
        onSuccess={() => {
          const query = selectedLocationSlug
            ? `?location=${selectedLocationSlug}`
            : "";
          router.push(toRoute(`/worker/handovers${query}`));
        }}
        open={!!handoverTarget}
        target={handoverTarget}
      />
    </PageShell>
  );
}
