"use client";

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
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-xl shadow-black/[0.02] border border-slate-200/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 border-0 bg-slate-50 pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search locations by name or slug..."
          value={draftSearch}
        />
      </div>

      <div className="flex items-center gap-2">
        <Select
          onValueChange={onTypeChange}
          value={type || "all"}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="store">Stores</SelectItem>
            <SelectItem value="warehouse">Warehouses</SelectItem>
            <SelectItem value="office">Offices</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={onStatusChange}
          value={status || "all"}
        >
          <SelectTrigger className="min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters ? (
        <Button
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4 text-slate-400 hover:text-slate-900 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <X className="mr-2 size-4" aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-3 pr-2">
        <div className="h-4 w-px bg-slate-200" aria-hidden="true" />
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
          {totalCount} locations
        </span>
      </div>
    </div>
  );
}
