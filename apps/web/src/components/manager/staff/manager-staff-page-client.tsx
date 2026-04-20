"use client";

import type { LocationStaffSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCheck } from "lucide-react";
import { useMemo } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerStaff,
  managerStaffQueryKey,
} from "@/lib/react-query/manager-staff";

const STAFF_SKELETON_KEYS = ["staff-1", "staff-2", "staff-3"] as const;

export function ManagerStaffPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("staff.view");
  const staffQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("A staff location is required.");
      }
      return fetchManagerStaff(selectedLocationScope.locationId);
    },
    queryKey: managerStaffQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 30_000,
  });
  const staff = staffQuery.data?.items ?? [];
  const workerCount = useMemo(
    () => staff.filter((member) => member.roleSlug === "worker").length,
    [staff],
  );
  const managerCount = useMemo(
    () => staff.filter((member) => member.roleSlug === "manager").length,
    [staff],
  );

  return (
    <PageShell>
      <PageHeader
        description="View the active managers and workers assigned to a location before assigning stock."
        title="Team at this location"
      />

      <LocationScopePanel
        description="Staff visibility follows the location scopes already attached to your manager access."
        emptyDescription="No managed location is available for this staff view."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      {staffQuery.isPending && selectedLocationScope ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {STAFF_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : staffQuery.isError ? (
        <AppErrorBanner
          detail="Could not load location staff."
          error={staffQuery.error}
          onRetry={() => void staffQuery.refetch()}
          title="Unable to load staff"
        />
      ) : selectedLocationScope ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              description="Workers assigned to this location."
              icon={UserCheck}
              label="Workers"
              value={workerCount}
            />
            <StatCard
              description="Managers assigned to this location."
              icon={ShieldCheck}
              label="Managers"
              value={managerCount}
            />
            <StatCard
              description="Active staff records loaded for this location."
              icon={UserCheck}
              label="Total staff"
              value={staff.length}
            />
          </div>
          <StaffList
            items={staff}
            locationName={
              staffQuery.data?.locationName ??
              selectedLocationScope.locationName
            }
          />
        </div>
      ) : null}
    </PageShell>
  );
}

function StaffList({
  items,
  locationName,
}: {
  items: readonly LocationStaffSummary[];
  locationName: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No staff assigned</CardTitle>
          <CardDescription>
            Assign workers or managers to this location from admin access before
            managing stock ownership.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{locationName || "Location team"}</CardTitle>
        <CardDescription>
          Staff available for stock assignment and day-to-day supervision at
          this location.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.map((member) => (
          <div
            key={`${member.userId}:${member.roleSlug}`}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {member.firstName} {member.lastName}
                </p>
                <Badge
                  variant={
                    member.roleSlug === "manager" ? "secondary" : "outline"
                  }
                >
                  {member.roleName}
                </Badge>
                <Badge variant="outline">{member.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {member.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Assigned{" "}
                {new Date(member.assignedAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium tabular-nums">
                {member.activeAssignmentCount}
              </p>
              <p className="text-xs text-muted-foreground">
                active stock assignment
                {member.activeAssignmentCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
