"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchLocationAssignments,
  locationAssignmentsQueryKey,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import { ManagerAssignmentCurrentList } from "./manager-assignment-current-list";

const ASSIGNMENT_SKELETON_KEYS = [1, 2, 3, 4, 5] as const;

export function ManagerAssignmentsPageClient() {
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

  const newAssignmentHref = toRoute(
    `/manager/assignments/new${selectedLocationSlug ? `?location=${selectedLocationSlug}` : ""}`,
  );

  return (
    <PageShell>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          description="View current stock ownership and assign variants to workers at this location."
          title="Stock assignments"
        />
        {selectedLocationScope && (
          <Link
            className={buttonVariants({
              variant: "default",
              className: "shrink-0",
            })}
            href={newAssignmentHref}
          >
            <Plus className="mr-1.5 size-4" />
            New assignment
          </Link>
        )}
      </div>

      <LocationScopePanel
        description="Assignment visibility follows the managed locations already linked to your access."
        emptyDescription="No managed location is available for stock assignments."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Assignment location"
      />

      {assignmentsQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-2">
          {ASSIGNMENT_SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-14 w-full" />
          ))}
        </div>
      ) : assignmentsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load location assignments."
          error={assignmentsQuery.error}
          onRetry={() => void assignmentsQuery.refetch()}
          title="Unable to load assignments"
        />
      ) : selectedLocationScope ? (
        <ManagerAssignmentCurrentList
          items={assignmentsQuery.data?.items ?? []}
          locationName={
            assignmentsQuery.data?.locationName ||
            selectedLocationScope.locationName
          }
        />
      ) : null}
    </PageShell>
  );
}
