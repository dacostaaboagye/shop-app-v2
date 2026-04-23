"use client";

import type {
  AdminLocationSummary,
  AdminStaffRoleFilter,
} from "@shop/contracts";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search staff by name or email..."
          value={draftSearch}
        />
      </div>

      <div className="flex items-center gap-2">
        <Select onValueChange={onLocationChange} value={locationSlug || "all"}>
          <SelectTrigger className="min-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.slug} value={loc.slug}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(nextRole) =>
            onRoleChange(nextRole as AdminStaffRoleFilter)
          }
          value={role || "all"}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="manager">Managers</SelectItem>
            <SelectItem value="worker">Workers</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(nextStatus) =>
            onStatusChange(
              nextStatus as "active" | "all" | "deactivated" | "suspended",
            )
          }
          value={status || "all"}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters ? (
        <Button
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-3 pr-2">
        <div className="h-4 w-px bg-muted" />
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
          {totalCount} staff
        </span>
      </div>
    </div>
  );
}
