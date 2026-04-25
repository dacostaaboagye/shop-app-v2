"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";

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
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_auto]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="locations-filter-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                id="locations-filter-search"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Name or slug"
                value={draftSearch}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="locations-filter-type">Type</Label>
            <Select onValueChange={onTypeChange} value={type}>
              <SelectTrigger className="h-10" id="locations-filter-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="store">Store</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="locations-filter-status">Status</Label>
            <Select onValueChange={onStatusChange} value={status}>
              <SelectTrigger className="h-10" id="locations-filter-status">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 items-end">
            {hasFilters ? (
              <Button
                className="w-full sm:w-auto"
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <p className="type-support type-inline-metric text-muted-foreground">
          {formatCount(totalCount)} locations
          {type !== "all" ? ` in ${type}` : ""}
          {status !== "all" ? ` marked ${status}` : ""}
          {draftSearch
            ? " matching the current filters"
            : " across the network"}
        </p>
      </div>
    </div>
  );
}
