import type { ReactNode } from "react";
import { LayoutList, Search, SquareStack, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FILTER_OPTIONS,
  type RequestFilter,
  type SupplyRequestCounts,
  type ViewMode,
} from "./manager-supply-requests.support";

export function RequestToolbar({
  counts,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  search,
  statusFilter,
  viewMode,
}: {
  counts: SupplyRequestCounts;
  search: string;
  statusFilter: RequestFilter;
  viewMode: ViewMode;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: RequestFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          id="requests-search"
          inputMode="search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search product, SKU, worker..."
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
      <StatusFilterButtons
        counts={counts}
        onStatusFilterChange={onStatusFilterChange}
        statusFilter={statusFilter}
      />
      <ViewModeToggle onViewModeChange={onViewModeChange} viewMode={viewMode} />
    </div>
  );
}

function StatusFilterButtons({
  counts,
  onStatusFilterChange,
  statusFilter,
}: {
  counts: SupplyRequestCounts;
  statusFilter: RequestFilter;
  onStatusFilterChange: (value: RequestFilter) => void;
}) {
  return (
    <div
      aria-label="Filter by status"
      className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1"
      role="group"
    >
      {FILTER_OPTIONS.map((option) => (
        <button
          aria-pressed={statusFilter === option.value}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-ring",
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
            <CountBadge active={statusFilter === option.value} value={counts[option.value]} />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function CountBadge({ active, value }: { active: boolean; value: number }) {
  return (
    <span
      className={cn(
        "rounded px-1 text-[10px] tabular-nums",
        active ? "bg-muted text-muted-foreground" : "opacity-60",
      )}
    >
      {value}
    </span>
  );
}

function ViewModeToggle({
  onViewModeChange,
  viewMode,
}: {
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
}) {
  return (
    <div
      aria-label="Change view"
      className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1"
      role="group"
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
    </div>
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
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-ring",
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
