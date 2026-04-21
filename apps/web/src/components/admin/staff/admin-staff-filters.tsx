"use client";

import type {
  AdminLocationSummary,
  AdminStaffRoleFilter,
} from "@shop/contracts";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name or email"
          value={draftSearch}
        />
      </div>
      <Select
        aria-label="Filter by role"
        className="h-9"
        onChange={(event) =>
          onRoleChange(event.target.value as AdminStaffRoleFilter)
        }
        value={role}
      >
        <option value="all">All staff roles</option>
        <option value="manager">Managers</option>
        <option value="worker">Workers</option>
      </Select>
      <Select
        aria-label="Filter by location"
        className="h-9"
        onChange={(event) => onLocationChange(event.target.value)}
        value={locationSlug}
      >
        <option value="">All locations</option>
        {locations.map((location) => (
          <option key={location.slug} value={location.slug}>
            {location.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by status"
        className="h-9"
        onChange={(event) =>
          onStatusChange(
            event.target.value as
              | "active"
              | "all"
              | "deactivated"
              | "suspended",
          )
        }
        value={status}
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="deactivated">Deactivated</option>
      </Select>
      {hasFilters ? (
        <Button onClick={onClear} size="sm" type="button" variant="ghost">
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}
      <span className="ml-auto text-sm tabular-nums text-muted-foreground">
        {totalCount} total
      </span>
    </div>
  );
}
