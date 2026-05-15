"use client";

import type {
  ManagerHandoverLane,
  ManagerHandoverSummary,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchLocationAssignments,
  fetchManagerHandovers,
  locationAssignmentsQueryKey,
  managerHandoversQueryKey,
  postManagerRevertHandover,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import { ManagerAssignmentCurrentList } from "./manager-assignment-current-list";
import { ManagerHandoverOversightPanel } from "./manager-handover-oversight-panel";
import { emptyManagerHandoverLaneCounts } from "./manager-handovers-support";

const ASSIGNMENT_SKELETON_KEYS = [1, 2, 3, 4, 5] as const;
const DEFAULT_HANDOVER_LANE: ManagerHandoverLane = "active";

export function ManagerAssignmentsPageClient() {
  const queryClient = useQueryClient();
  const [selectedHandoverLane, setSelectedHandoverLane] =
    useState<ManagerHandoverLane>(DEFAULT_HANDOVER_LANE);
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.view");

  const assignmentsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("An assignment location is required.");
      }
      return fetchLocationAssignments(selectedLocationScope.locationId);
    },
    queryKey: locationAssignmentsQueryKey(
      selectedLocationScope?.locationId ?? "",
    ),
    staleTime: 30_000,
  });

  const handoversQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("A handover location is required.");
      }
      return fetchManagerHandovers(selectedLocationScope.locationId);
    },
    queryKey: managerHandoversQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });

  const revertHandoverMutation = useMutation({
    mutationFn: (item: ManagerHandoverSummary) =>
      postManagerRevertHandover({ handoverChainId: item.handoverChainId }),
    onError: () => {
      toast.error("Handover could not be reverted.");
    },
    onSuccess: async (_result, item) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: managerHandoversQueryKey(item.locationId),
        }),
        queryClient.invalidateQueries({
          queryKey: locationAssignmentsQueryKey(item.locationId),
        }),
      ]);
      toast.success("Handover reverted.");
    },
  });

  const newAssignmentHref = toRoute(
    `/manager/assignments/new${selectedLocationSlug ? `?location=${selectedLocationSlug}` : ""}`,
  );

  return (
    <PageShell>
      <PageHeader
        actions={
          selectedLocationScope ? (
            <Link
              className={buttonVariants({
                className: "shrink-0",
                variant: "default",
              })}
              href={newAssignmentHref}
            >
              <Plus className="mr-1.5 size-4" />
              New assignment
            </Link>
          ) : null
        }
        description="View current stock ownership and assign variants to workers at this location."
        title="Stock assignments"
      />

      <LocationScopePanel
        description="Assignment visibility follows the managed locations already linked to your access."
        emptyDescription="No managed location is available for stock assignments."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Assignment location"
      />

      {selectedLocationScope ? (
        <div className="flex flex-col gap-6">
          {assignmentsQuery.isPending ? (
            <AssignmentListSkeleton />
          ) : assignmentsQuery.isError ? (
            <AppErrorBanner
              detail="Could not load location assignments."
              error={assignmentsQuery.error}
              onRetry={() => void assignmentsQuery.refetch()}
              title="Unable to load assignments"
            />
          ) : (
            <ManagerAssignmentCurrentList
              items={assignmentsQuery.data?.items ?? []}
              locationName={
                assignmentsQuery.data?.locationName ||
                selectedLocationScope.locationName
              }
            />
          )}

          {handoversQuery.isPending ? (
            <AssignmentListSkeleton />
          ) : handoversQuery.isError ? (
            <AppErrorBanner
              detail="Could not load handovers for this location."
              error={handoversQuery.error}
              onRetry={() => void handoversQuery.refetch()}
              title="Unable to load handovers"
            />
          ) : (
            <ManagerHandoverOversightPanel
              counts={
                handoversQuery.data?.laneCounts ??
                emptyManagerHandoverLaneCounts()
              }
              items={handoversQuery.data?.items ?? []}
              locationName={
                handoversQuery.data?.locationName ||
                selectedLocationScope.locationName
              }
              onLaneChange={setSelectedHandoverLane}
              onRevert={(item) => revertHandoverMutation.mutate(item)}
              revertingChainId={
                revertHandoverMutation.isPending
                  ? (revertHandoverMutation.variables?.handoverChainId ?? null)
                  : null
              }
              selectedLane={selectedHandoverLane}
            />
          )}
        </div>
      ) : null}
    </PageShell>
  );
}

function AssignmentListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {ASSIGNMENT_SKELETON_KEYS.map((key) => (
        <Skeleton key={key} className="h-14 w-full" />
      ))}
    </div>
  );
}
