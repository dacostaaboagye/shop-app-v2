"use client";

import { SupplyRequestToolbar as SharedSupplyRequestToolbar } from "@/components/stock/supply-request-toolbar";
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
    <SharedSupplyRequestToolbar
      counts={counts}
      filterOptions={FILTER_OPTIONS}
      onSearchChange={onSearchChange}
      onStatusFilterChange={onStatusFilterChange}
      onViewModeChange={onViewModeChange}
      search={search}
      searchId="requests-search"
      searchPlaceholder="Search product, SKU, worker..."
      statusFilter={statusFilter}
      viewMode={viewMode}
    />
  );
}
