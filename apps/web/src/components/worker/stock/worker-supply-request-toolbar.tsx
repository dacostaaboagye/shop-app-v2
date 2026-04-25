"use client";

import { SupplyRequestToolbar as SharedSupplyRequestToolbar } from "@/components/stock/supply-request-toolbar";
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
    <SharedSupplyRequestToolbar
      counts={counts}
      filterOptions={WORKER_FILTER_OPTIONS}
      onSearchChange={onSearchChange}
      onStatusFilterChange={onStatusFilterChange}
      onViewModeChange={onViewModeChange}
      search={search}
      searchId="worker-requests-search"
      searchPlaceholder="Search product, SKU, reference..."
      statusFilter={statusFilter}
      viewMode={viewMode}
    />
  );
}
