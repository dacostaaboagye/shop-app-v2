"use client";

import type {
  AdminLocationSummary,
  AdminStaffRoleFilter,
} from "@shop/contracts";
import { AdminDirectoryFilterPanel } from "@/components/admin/admin-directory-filter-panel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";

export const STAFF_ROLE_FILTER_OPTIONS = ["all", "manager", "worker"] as const;

export const LOCATION_FILTER_QUERY = {
  dir: "asc",
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name",
  status: "all",
  type: "all",
} as const;

type AdminStaffFiltersProps = {
  draftSearch: string;
  hasFilters: boolean;
  locationSlug: string;
  locations: AdminLocationSummary[];
  onClear: () => void;
  onLocationChange: (locationSlug: string) => void;
  onRoleChange: (role: AdminStaffRoleFilter) => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (
    status: "active" | "all" | "deactivated" | "suspended",
  ) => void;
  role: AdminStaffRoleFilter;
  status: "active" | "all" | "deactivated" | "suspended";
  totalCount: number;
};

export function AdminStaffFilters({
  draftSearch,
  hasFilters,
  locationSlug,
  locations,
  onClear,
  onLocationChange,
  onRoleChange,
  onSearchChange,
  onStatusChange,
  role,
  status,
  totalCount,
}: AdminStaffFiltersProps) {
  return (
    <AdminDirectoryFilterPanel
      clearLabel="Clear"
      extraControls={
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-48">
            <Label htmlFor="staff-filter-location">Location</Label>
            <Select
              onValueChange={onLocationChange}
              value={locationSlug || "all"}
            >
              <SelectTrigger className="h-10" id="staff-filter-location">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.slug} value={location.slug}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
            <Label htmlFor="staff-filter-role">Role</Label>
            <Select
              onValueChange={(nextRole) =>
                onRoleChange(nextRole as AdminStaffRoleFilter)
              }
              value={role || "all"}
            >
              <SelectTrigger className="h-10" id="staff-filter-role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="manager">Managers</SelectItem>
                <SelectItem value="worker">Workers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:min-w-40">
            <Label htmlFor="staff-filter-status">Status</Label>
            <Select
              onValueChange={(nextStatus) =>
                onStatusChange(
                  nextStatus as "active" | "all" | "deactivated" | "suspended",
                )
              }
              value={status || "all"}
            >
              <SelectTrigger className="h-10" id="staff-filter-status">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={onSearchChange}
      placeholder="Name or email"
      searchId="staff-filter-search"
      summary={`${formatCount(totalCount)} staff${locationSlug ? " in the selected location" : ""}${role !== "all" ? ` with the ${role} role` : ""}${status !== "all" ? ` marked ${status}` : ""}${draftSearch ? " matching the current filters" : " across the network"}`}
      value={draftSearch}
    />
  );
}
