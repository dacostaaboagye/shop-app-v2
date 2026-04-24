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
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          className="h-11 border-border/60 bg-muted/20 pl-11 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl placeholder:text-muted-foreground/40 font-medium"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search locations by name or slug..."
          value={draftSearch}
        />
      </div>

      <div className="flex items-center gap-3">
        <Select onValueChange={onTypeChange} value={type || "all"}>
          <SelectTrigger className="h-11 min-w-[140px] rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50 shadow-sm">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="store">Stores</SelectItem>
            <SelectItem value="warehouse">Warehouses</SelectItem>
            <SelectItem value="office">Offices</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onStatusChange} value={status || "all"}>
          <SelectTrigger className="h-11 min-w-[140px] rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50 shadow-sm">
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
          className="h-11 rounded-xl px-5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <X className="mr-2 size-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-4 pr-2">
        <div className="h-4 w-px bg-border/60" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 tabular-nums">
          {totalCount} locations
        </span>
      </div>
    </div>
  );
}
