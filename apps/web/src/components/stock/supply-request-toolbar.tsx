"use client";

import { LayoutList, Search, SquareStack, X } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/display/format";
import { cn } from "@/lib/utils";

type FilterOption<TFilter extends string> = {
  label: string;
  value: TFilter;
};

export function SupplyRequestToolbar<
  TFilter extends string,
  TViewMode extends "card" | "compact",
>({
  counts,
  filterOptions,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  search,
  searchId,
  searchPlaceholder,
  statusFilter,
  viewMode,
}: {
  counts: Record<TFilter, number>;
  filterOptions: ReadonlyArray<FilterOption<TFilter>>;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: TFilter) => void;
  onViewModeChange: (value: TViewMode) => void;
  search: string;
  searchId: string;
  searchPlaceholder: string;
  statusFilter: TFilter;
  viewMode: TViewMode;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative min-w-0 flex-1 lg:min-w-40">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10 pr-9"
          id={searchId}
          inputMode="search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          value={search}
        />
        {search ? (
          <button
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-ring"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <StatusFilterButtons
        counts={counts}
        filterOptions={filterOptions}
        onStatusFilterChange={onStatusFilterChange}
        statusFilter={statusFilter}
      />
      <ViewModeToggle onViewModeChange={onViewModeChange} viewMode={viewMode} />
    </div>
  );
}

function StatusFilterButtons<TFilter extends string>({
  counts,
  filterOptions,
  onStatusFilterChange,
  statusFilter,
}: {
  counts: Record<TFilter, number>;
  filterOptions: ReadonlyArray<FilterOption<TFilter>>;
  onStatusFilterChange: (value: TFilter) => void;
  statusFilter: TFilter;
}) {
  return (
    <fieldset
      aria-label="Filter by status"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
    >
      {filterOptions.map((option) => (
        <button
          aria-pressed={statusFilter === option.value}
          className={cn(
            "inline-flex min-w-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-ring",
            statusFilter === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={option.value}
          onClick={() => onStatusFilterChange(option.value)}
          type="button"
        >
          {option.label}
          {counts[option.value] > 0 ? (
            <CountBadge
              active={statusFilter === option.value}
              value={counts[option.value]}
            />
          ) : null}
        </button>
      ))}
    </fieldset>
  );
}

function CountBadge({ active, value }: { active: boolean; value: number }) {
  return (
    <span
      className={cn(
        "rounded px-1 text-[10px] tabular-nums",
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground/70",
      )}
    >
      {formatCount(value)}
    </span>
  );
}

function ViewModeToggle<TViewMode extends "card" | "compact">({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (value: TViewMode) => void;
  viewMode: TViewMode;
}) {
  return (
    <fieldset
      aria-label="Change view"
      className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
    >
      <ViewModeButton
        active={viewMode === "card"}
        label="Card view"
        onClick={() => onViewModeChange("card" as TViewMode)}
      >
        <SquareStack className="size-4" />
      </ViewModeButton>
      <ViewModeButton
        active={viewMode === "compact"}
        label="Compact list view"
        onClick={() => onViewModeChange("compact" as TViewMode)}
      >
        <LayoutList className="size-4" />
      </ViewModeButton>
    </fieldset>
  );
}

function ViewModeButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-ring",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
