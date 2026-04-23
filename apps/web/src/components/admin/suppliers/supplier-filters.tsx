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

export function SupplierFilters({
  draftSearch,
  onDraftSearchChange,
  status,
  onStatusChange,
  hasFilters,
  onClear,
  totalCount,
}: {
  draftSearch: string;
  onDraftSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  hasFilters: boolean;
  onClear: () => void;
  totalCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-border/50">
      <div className="relative min-w-[320px] flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-0 bg-muted pl-10 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-xl"
          onChange={(e) => onDraftSearchChange(e.target.value)}
          placeholder="Search name or email"
          value={draftSearch}
        />
      </div>
      <Select onValueChange={onStatusChange} value={status}>
        <SelectTrigger className="h-10 min-w-[140px]">
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters ? (
        <Button
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onClear}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        <div className="h-4 w-px bg-border" />
        <span className="text-sm tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          suppliers
        </span>
      </div>
    </div>
  );
}
