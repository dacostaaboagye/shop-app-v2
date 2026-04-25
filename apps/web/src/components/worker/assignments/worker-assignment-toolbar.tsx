"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { ViewModeToggle } from "./worker-assignment-view-mode-toggle";
import {
  FILTER_OPTIONS,
  formatStockFilterLabel,
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
    <div className="relative min-w-64 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
      <Input
        className="h-10 rounded-xl border-border bg-white pl-10 pr-10 shadow-sm transition-all focus:bg-background focus:ring-primary/20"
        id="assignments-search"
        inputMode="search"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search product, variant, SKU..."
        value={search}
      />
      {search ? (
        <Button
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-lg text-muted-foreground/60 hover:bg-muted"
          onClick={() => onSearchChange("")}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" />
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
      className="flex w-fit items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-[3px]"
    >
      {FILTER_OPTIONS.map((option) => (
        <button
          aria-pressed={stockFilter === option.value}
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98]",
            stockFilter === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
          id={`filter-${option.value}`}
          key={option.value}
          onClick={() => onStockFilterChange(option.value)}
          type="button"
        >
          {formatStockFilterLabel(option.value)}
          {counts[option.value] > 0 ? (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                stockFilter === option.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground/60",
              )}
            >
              {formatCount(counts[option.value])}
            </span>
          ) : null}
        </button>
      ))}
    </fieldset>
  );
}
