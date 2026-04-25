import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ClipboardList } from "lucide-react";
import {
  SupplyRequestFilterSummary,
  SupplyRequestNoResults,
} from "@/components/stock/supply-request-list-surfaces";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { WorkerSupplyRequestCard } from "./worker-supply-request-card";
import { CompactWorkerSupplyRequestList } from "./worker-supply-request-compact-list";
import { WorkerSupplyRequestToolbar } from "./worker-supply-request-toolbar";
import type {
  WorkerRequestCounts,
  WorkerRequestFilter,
  WorkerViewMode,
} from "./worker-supply-requests.support";

type Props = {
  allItems: StockSupplyRequestResponse[];
  counts: WorkerRequestCounts;
  filteredItems: StockSupplyRequestResponse[];
  search: string;
  statusFilter: WorkerRequestFilter;
  viewMode: WorkerViewMode;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: WorkerRequestFilter) => void;
  onViewModeChange: (value: WorkerViewMode) => void;
};

export function WorkerSupplyRequestList({
  allItems,
  counts,
  filteredItems,
  onConfirmReceipt,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  search,
  statusFilter,
  viewMode,
}: Props) {
  if (allItems.length === 0) {
    return (
      <AppEmptyState
        description="Submit a supply request from your assignments page."
        icon={ClipboardList}
        kind="no-data"
        title="No requests yet"
      />
    );
  }

  const hasActiveFilter = statusFilter !== "all" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <WorkerSupplyRequestToolbar
        counts={counts}
        onSearchChange={onSearchChange}
        onStatusFilterChange={onStatusFilterChange}
        onViewModeChange={onViewModeChange}
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />
      {hasActiveFilter ? (
        <SupplyRequestFilterSummary
          filteredCount={filteredItems.length}
          totalCount={allItems.length}
        />
      ) : null}
      <WorkerSupplyRequestResults
        filteredItems={filteredItems}
        onClearFilters={() => {
          onSearchChange("");
          onStatusFilterChange("all");
        }}
        onConfirmReceipt={onConfirmReceipt}
        viewMode={viewMode}
      />
    </div>
  );
}

function WorkerSupplyRequestResults({
  filteredItems,
  onClearFilters,
  onConfirmReceipt,
  viewMode,
}: {
  filteredItems: StockSupplyRequestResponse[];
  onClearFilters: () => void;
  onConfirmReceipt: (item: StockSupplyRequestResponse) => void;
  viewMode: WorkerViewMode;
}) {
  if (filteredItems.length === 0) {
    return <SupplyRequestNoResults onClearFilters={onClearFilters} />;
  }

  if (viewMode === "compact") {
    return (
      <CompactWorkerSupplyRequestList
        items={filteredItems}
        onConfirmReceipt={onConfirmReceipt}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredItems.map((item) => (
        <WorkerSupplyRequestCard
          item={item}
          key={item.supplyRequestId}
          onConfirmReceipt={onConfirmReceipt}
        />
      ))}
    </div>
  );
}
