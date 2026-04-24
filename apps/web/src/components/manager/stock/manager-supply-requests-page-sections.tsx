"use client";

import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomingRequestList } from "./manager-supply-request-list";
import type {
  RequestFilter,
  ViewMode,
} from "./manager-supply-requests.support";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function LocationFilterChips({
  locationScopes,
  onLocationChange,
  selectedLocationSlug,
}: {
  locationScopes: Array<{
    locationId: string;
    locationName: string;
    locationSlug: string;
  }>;
  onLocationChange: (slug: string) => void;
  selectedLocationSlug: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/30 p-3 ring-1 ring-border/50">
      <span className="text-xs font-medium text-muted-foreground">
        Location
      </span>
      <button
        type="button"
        onClick={() => onLocationChange("")}
        className={[
          "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
          !selectedLocationSlug
            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        ].join(" ")}
      >
        All locations
      </button>
      {locationScopes.map((scope) => (
        <button
          key={scope.locationId}
          type="button"
          onClick={() => onLocationChange(scope.locationSlug)}
          className={[
            "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
            selectedLocationSlug === scope.locationSlug
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          ].join(" ")}
        >
          {scope.locationName}
        </button>
      ))}
      {selectedLocationSlug && (
        <Badge variant="secondary" className="ml-auto text-xs">
          Filtered
        </Badge>
      )}
    </div>
  );
}

export function RequestContent({
  allItems,
  counts,
  filteredItems,
  hasLocations,
  isLoading,
  manageableLocationIds,
  onAction,
  onRetry,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  queryError,
  queryState,
  search,
  statusFilter,
  viewMode,
}: {
  allItems: Parameters<typeof IncomingRequestList>[0]["allItems"];
  counts: Parameters<typeof IncomingRequestList>[0]["counts"];
  filteredItems: Parameters<typeof IncomingRequestList>[0]["filteredItems"];
  hasLocations: boolean;
  isLoading: boolean;
  manageableLocationIds: string[];
  onAction: Parameters<typeof IncomingRequestList>[0]["onAction"];
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: RequestFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
  search: string;
  statusFilter: RequestFilter;
  viewMode: ViewMode;
}) {
  if (isLoading || queryState === "pending") return <SupplyRequestSkeleton />;
  if (!hasLocations) return null;
  if (queryState === "error") {
    return (
      <AppErrorBanner
        detail="Could not load supply requests. Please try again."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load requests"
      />
    );
  }

  return (
    <IncomingRequestList
      allItems={allItems}
      counts={counts}
      filteredItems={filteredItems}
      manageableLocationIds={manageableLocationIds}
      onAction={onAction}
      onSearchChange={onSearchChange}
      onStatusFilterChange={onStatusFilterChange}
      onViewModeChange={onViewModeChange}
      search={search}
      statusFilter={statusFilter}
      viewMode={viewMode}
    />
  );
}

function SupplyRequestSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {SKELETON_KEYS.map((key) => (
        <Skeleton className="h-44 w-full rounded-xl" key={key} />
      ))}
    </div>
  );
}
