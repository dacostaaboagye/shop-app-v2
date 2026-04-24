"use client";

import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomingRequestList } from "./manager-supply-request-list";
import type {
  RequestFilter,
  ViewMode,
} from "./manager-supply-requests.support";

const SKELETON_KEYS = [1, 2, 3, 4, 5];

export function RequestContent({
  allItems,
  counts,
  filteredItems,
  hasLocations,
  isLoading,
  locationName,
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
  locationName: string | null;
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
      locationName={locationName}
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
