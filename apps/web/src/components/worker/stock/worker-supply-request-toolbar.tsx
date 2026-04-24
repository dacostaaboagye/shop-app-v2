import { LayoutList, Search, SquareStack, X } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  WORKER_FILTER_OPTIONS,
  type WorkerRequestCounts,
  type WorkerRequestFilter,
  type WorkerViewMode,
} from "./worker-supply-requests.support";

export function WorkerSupplyRequestToolbar({
  counts,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  search,
  statusFilter,
  viewMode,
}: {
  counts: WorkerRequestCounts;
  search: string;
  statusFilter: WorkerRequestFilter;
  viewMode: WorkerViewMode;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: WorkerRequestFilter) => void;
  onViewModeChange: (value: WorkerViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl border-border/60 bg-white pl-9 pr-9 shadow-sm transition-all focus:ring-primary/20"
          id="worker-requests-search"
          inputMode="search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search product, SKU, reference..."
          value={search}
        />
        {search ? (
          <button
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-ring"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <FilterButtons
        counts={counts}
        onStatusFilterChange={onStatusFilterChange}
        statusFilter={statusFilter}
      />
      <ViewModeToggle onViewModeChange={onViewModeChange} viewMode={viewMode} />
    </div>
  );
}

function FilterButtons({
  counts,
  onStatusFilterChange,
  statusFilter,
}: {
  counts: WorkerRequestCounts;
  statusFilter: WorkerRequestFilter;
  onStatusFilterChange: (value: WorkerRequestFilter) => void;
}) {
  return (
    <fieldset
      aria-label="Filter by status"
      className="flex w-fit items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-[3px]"
    >
      {WORKER_FILTER_OPTIONS.map((option) => (
        <button
          aria-pressed={statusFilter === option.value}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all focus-visible:outline-ring",
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
            <span
              className={cn(
                "rounded px-1 text-[10px] tabular-nums",
                statusFilter === option.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground opacity-60",
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

function ViewModeToggle({
  onViewModeChange,
  viewMode,
}: {
  viewMode: WorkerViewMode;
  onViewModeChange: (value: WorkerViewMode) => void;
}) {
  return (
    <fieldset
      aria-label="Change view"
      className="flex w-fit items-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-[3px]"
    >
      <ViewModeButton
        active={viewMode === "card"}
        label="Card view"
        onClick={() => onViewModeChange("card")}
      >
        <SquareStack className="size-4" />
      </ViewModeButton>
      <ViewModeButton
        active={viewMode === "compact"}
        label="Compact list view"
        onClick={() => onViewModeChange("compact")}
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
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all focus-visible:outline-ring",
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
