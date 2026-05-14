"use client";

import type {
  WorkerHandoverLane,
  WorkerHandoverSummary,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchWorkerHandovers,
  postWorkerRevertHandover,
  workerAssignmentsQueryKey,
  workerHandoversQueryKey,
} from "@/lib/react-query/worker-assignments";
import {
  HandoverDetail,
  HandoverLaneControls,
  HandoverQueue,
} from "./worker-handover-sections";
import {
  emptyLaneCounts,
  filterWorkerHandovers,
  workerHandoverLanes,
} from "./worker-handovers-support";

const DEFAULT_LANE: WorkerHandoverLane = "active_received";
const SKELETON_KEYS = [1, 2, 3];

export function WorkerHandoversPageClient() {
  const [search, setSearch] = useState("");
  const [selectedLane, setSelectedLane] =
    useState<WorkerHandoverLane>(DEFAULT_LANE);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.handovers.manage");

  const handoversQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("A handover location is required.");
      }
      return fetchWorkerHandovers(selectedLocationScope.locationId);
    },
    queryKey: workerHandoversQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });

  const allItems = handoversQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () =>
      filterWorkerHandovers({
        items: allItems,
        lane: selectedLane,
        search,
      }),
    [allItems, search, selectedLane],
  );
  const selectedItem =
    filteredItems.find((item) => item.handoverChainId === selectedChainId) ??
    filteredItems[0] ??
    null;

  useEffect(() => {
    setSelectedChainId(selectedItem?.handoverChainId ?? null);
  }, [selectedItem?.handoverChainId]);

  const revertMutation = useMutation({
    mutationFn: (item: WorkerHandoverSummary) =>
      postWorkerRevertHandover({ handoverChainId: item.handoverChainId }),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to revert handover.",
        }),
      );
    },
    onSuccess(_data, item) {
      toast.success("Handover reverted.");
      void queryClient.invalidateQueries({
        queryKey: workerHandoversQueryKey(item.locationId),
      });
      void queryClient.invalidateQueries({
        queryKey: workerAssignmentsQueryKey(item.locationId),
      });
    },
  });

  return (
    <PageShell>
      <PageHeader
        description="Review custody handovers you gave or received, then revert active custody when the stock needs to return."
        title="Stock handovers"
      />

      <LocationScopePanel
        description="Handovers load from the location scope attached to your worker handover access."
        emptyDescription="No assigned location is available for your handover view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedChainId(null);
          setSelectedLocationSlug(slug);
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Handover location"
      />

      {handoversQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-3">
          {SKELETON_KEYS.map((key) => (
            <Skeleton className="h-36 w-full rounded-xl" key={key} />
          ))}
        </div>
      ) : handoversQuery.isError ? (
        <AppErrorBanner
          detail="Could not load your handovers for this location."
          error={handoversQuery.error}
          onRetry={() => void handoversQuery.refetch()}
          title="Unable to load handovers"
        />
      ) : selectedLocationScope ? (
        <div className="flex flex-col gap-4">
          <HandoverLaneControls
            counts={handoversQuery.data?.laneCounts ?? emptyLaneCounts()}
            lanes={workerHandoverLanes}
            onLaneChange={(lane) => {
              setSelectedChainId(null);
              setSelectedLane(lane);
            }}
            onSearchChange={setSearch}
            search={search}
            selectedLane={selectedLane}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
            <HandoverQueue
              items={filteredItems}
              onSelect={setSelectedChainId}
              selectedId={selectedChainId}
            />
            <HandoverDetail
              item={selectedItem}
              onRevert={(item) => revertMutation.mutate(item)}
              revertPending={revertMutation.isPending}
            />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
