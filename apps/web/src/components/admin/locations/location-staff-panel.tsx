"use client";

import type { AdminLocationStaffSummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLocationStaffQueryKey,
  fetchAdminLocationStaff,
} from "@/lib/react-query/admin-location-write";
import { getAdminStaffUserHref } from "./location-staff-links";

const STAFF_SKELETON_KEYS = ["staff-1", "staff-2", "staff-3"] as const;

export function LocationStaffPanel({ locationSlug }: { locationSlug: string }) {
  const staffQuery = useQuery({
    queryFn: () => fetchAdminLocationStaff(locationSlug),
    queryKey: adminLocationStaffQueryKey(locationSlug),
    staleTime: 60_000,
  });

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Assigned staff</CardTitle>
        <CardDescription>
          Managers and workers currently attached to this location.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {staffQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {STAFF_SKELETON_KEYS.map((key) => (
              <Skeleton className="h-16 w-full" key={key} />
            ))}
          </div>
        ) : staffQuery.isError ? (
          <AppErrorBanner
            detail="Could not load assigned staff for this location."
            error={staffQuery.error}
            onRetry={() => void staffQuery.refetch()}
            title="Unable to load staff"
          />
        ) : staffQuery.data.items.length === 0 ? (
          <AppEmptyState
            description="No active manager or worker role assignments are attached to this location."
            icon={UserRound}
            kind="no-data"
            title="No staff assigned"
          />
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {staffQuery.data.items.map((member) => (
              <StaffRow key={member.userSlug} member={member} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffRow({ member }: { member: AdminLocationStaffSummary }) {
  return (
    <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <PersonAvatar
          firstName={member.firstName}
          imageUrl={member.primaryImageUrl}
          lastName={member.lastName}
          size="md"
        />
        <div className="min-w-0">
          <Link
            className="block truncate text-sm font-medium hover:text-primary"
            href={getAdminStaffUserHref(member.userSlug)}
          >
            {member.firstName} {member.lastName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {member.email}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant={member.roleSlug === "manager" ? "default" : "outline"}>
          {member.roleName}
        </Badge>
        <Badge variant={member.status === "active" ? "secondary" : "outline"}>
          {member.status}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          {member.activeAssignmentCount} active assignment
          {member.activeAssignmentCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
