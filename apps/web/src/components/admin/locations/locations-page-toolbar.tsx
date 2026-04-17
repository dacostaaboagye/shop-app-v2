"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type LocationsPageToolbarProps = {
  draftSearch: string;
  hasFilters: boolean;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  status: string;
  totalCount: number;
  type: string;
};

export function LocationsPageToolbar({
  draftSearch,
  hasFilters,
  onClear,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  status,
  totalCount,
  type,
}: LocationsPageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or slug"
          value={draftSearch}
        />
      </div>
      <Select
        aria-label="Filter by type"
        className="h-9"
        onChange={(event) => onTypeChange(event.target.value)}
        value={type}
      >
        <option value="all">All types</option>
        <option value="store">Store</option>
        <option value="warehouse">Warehouse</option>
      </Select>
      <Select
        aria-label="Filter by status"
        className="h-9"
        onChange={(event) => onStatusChange(event.target.value)}
        value={status}
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
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
