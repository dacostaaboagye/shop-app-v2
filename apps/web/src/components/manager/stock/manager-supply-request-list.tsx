import type { StockSupplyRequestResponse } from "@shop/contracts";
import { ClipboardList } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import { SupplyRequestCard } from "./manager-supply-request-card";
import { CompactIncomingRequestList } from "./manager-supply-request-compact-list";
import { RequestToolbar } from "./manager-supply-request-toolbar";
import type {
  RequestFilter,
  SupplyRequestAction,
  SupplyRequestCounts,
  ViewMode,
} from "./manager-supply-requests.support";

type Props = {
  allItems: StockSupplyRequestResponse[];
  counts: SupplyRequestCounts;
  filteredItems: StockSupplyRequestResponse[];
  locationName: string | null;
  manageableLocationIds: string[];
  search: string;
  statusFilter: RequestFilter;
  viewMode: ViewMode;
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: RequestFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
};

export function IncomingRequestList({
  allItems,
  counts,
  filteredItems,
  locationName,
  manageableLocationIds,
  onAction,
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
        description={
          locationName
            ? `No supply requests are currently tied to ${locationName}.`
            : "No supply requests are currently tied to the selected location."
        }
        icon={ClipboardList}
        kind="no-data"
        title="No supply requests"
      />
    );
  }

  const hasActiveFilter = statusFilter !== "all" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <RequestToolbar
        counts={counts}
        onSearchChange={onSearchChange}
        onStatusFilterChange={onStatusFilterChange}
        onViewModeChange={onViewModeChange}
        search={search}
        statusFilter={statusFilter}
        viewMode={viewMode}
      />

      {hasActiveFilter ? (
        <p className="text-xs text-muted-foreground">
          {filteredItems.length === 0
            ? "No requests match your filters."
            : `Showing ${filteredItems.length} of ${allItems.length}`}
        </p>
      ) : null}

      <RequestResults
        filteredItems={filteredItems}
        manageableLocationIds={manageableLocationIds}
        onAction={onAction}
        onClearFilters={() => {
          onSearchChange("");
          onStatusFilterChange("all");
        }}
        viewMode={viewMode}
      />
    </div>
  );
}

function RequestResults({
  filteredItems,
  manageableLocationIds,
  onAction,
  onClearFilters,
  viewMode,
}: {
  filteredItems: StockSupplyRequestResponse[];
  manageableLocationIds: string[];
  onAction: (
    action: SupplyRequestAction,
    item: StockSupplyRequestResponse,
  ) => void;
  onClearFilters: () => void;
  viewMode: ViewMode;
}) {
  if (filteredItems.length === 0) {
    return (
      <AppEmptyState
        action={
          <Button onClick={onClearFilters} size="sm" variant="outline">
            Clear filters
          </Button>
        }
        description="Try a different search term or status filter."
        kind="no-results"
        title="No matching requests"
      />
    );
  }

  if (viewMode === "compact") {
    return (
      <CompactIncomingRequestList
        items={filteredItems}
        manageableLocationIds={manageableLocationIds}
        onAction={onAction}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredItems.map((item) => (
        <SupplyRequestCard
          canManage={manageableLocationIds.includes(item.sourceLocationId)}
          item={item}
          key={item.supplyRequestId}
          onAction={(action) => onAction(action, item)}
        />
      ))}
    </div>
  );
}
