"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, ShieldCheck, UserCheck } from "lucide-react";
import { useMemo } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import { formatMoney, toNumericAmount } from "@/lib/money/format-money";
import {
  fetchManagerStaff,
  managerStaffQueryKey,
} from "@/lib/react-query/manager-staff";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { ManagerStaffList } from "./manager-staff-list";

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
  const netWorkerSales = useMemo(
    () =>
      staff.reduce(
        (sum, member) => sum + (toNumericAmount(member.netSalesAmount) ?? 0),
        0,
      ),
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <StatCard
              description="Confirmed sales minus returns by assigned staff."
              icon={BarChart3}
              label="Net staff sales"
              value={formatMoney(netWorkerSales, moneyProfile)}
            />
          </div>
          <ManagerStaffList
            items={staff}
            locationName={
              staffQuery.data?.locationName ??
              selectedLocationScope.locationName
            }
            moneyProfile={moneyProfile}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
