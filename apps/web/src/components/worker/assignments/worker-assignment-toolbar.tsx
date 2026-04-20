"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "./worker-assignment-view-mode-toggle";
import {
  FILTER_OPTIONS,
  type StockFilter,
  type ViewMode,
} from "./worker-assignments-support";

export function AssignmentToolbar({
  counts,
  onSearchChange,
  onStockFilterChange,
  onViewModeChange,
  search,
  stockFilter,
  viewMode,
}: {
  counts: Record<StockFilter, number>;
  onSearchChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
  search: string;
  stockFilter: StockFilter;
  viewMode: ViewMode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AssignmentSearchInput onSearchChange={onSearchChange} search={search} />
      <StockFilterChips
        counts={counts}
        onStockFilterChange={onStockFilterChange}
        stockFilter={stockFilter}
      />
      <ViewModeToggle onViewModeChange={onViewModeChange} viewMode={viewMode} />
    </div>
  );
}

function AssignmentSearchInput({
  onSearchChange,
  search,
}: {
  onSearchChange: (value: string) => void;
  search: string;
}) {
  return (
    <div className="relative min-w-40 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9 pr-9"
        id="assignments-search"
        inputMode="search"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search product, variant, SKU..."
        value={search}
      />
      {search ? (
        <Button
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={() => onSearchChange("")}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X data-icon="inline-start" />
        </Button>
      ) : null}
    </div>
  );
}

function StockFilterChips({
  counts,
  onStockFilterChange,
  stockFilter,
}: {
  counts: Record<StockFilter, number>;
  onStockFilterChange: (value: StockFilter) => void;
  stockFilter: StockFilter;
}) {
  return (
    <fieldset
      aria-label="Filter by stock status"
      className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1"
    >
      {FILTER_OPTIONS.map((option) => (
        <button
          aria-pressed={stockFilter === option.value}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-ring",
            stockFilter === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          id={`filter-${option.value}`}
          key={option.value}
          onClick={() => onStockFilterChange(option.value)}
          type="button"
        >
          {option.label}
          {counts[option.value] > 0 ? (
            <span
              className={cn(
                "rounded px-1 text-[10px] tabular-nums",
                stockFilter === option.value
                  ? "bg-muted text-muted-foreground"
                  : "opacity-60",
              )}
            >
              {counts[option.value]}
            </span>
          ) : null}
        </button>
      ))}
    </fieldset>
  );
}
