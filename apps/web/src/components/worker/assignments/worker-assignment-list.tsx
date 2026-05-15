"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { Package } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/display/format";
import type { MoneyProfile } from "@/lib/money/format-money";
import { AssignmentCard } from "./worker-assignment-cards";
import { AssignmentSummary } from "./worker-assignment-summary";
import { AssignmentToolbar } from "./worker-assignment-toolbar";
import type {
  StockFilter,
  SupplyTarget,
  ViewMode,
} from "./worker-assignments-support";
import { CompactAssignmentList } from "./worker-compact-assignment-list";

type AssignmentListProps = {
  allItems: CurrentAssignment[];
  counts: Record<StockFilter, number>;
  filteredItems: CurrentAssignment[];
  locationId: string;
  locationName: string | undefined;
  moneyProfile: MoneyProfile;
  onBulkRequestSupply: () => void;
  onRequestSupply: (target: SupplyTarget) => void;
  onSearchChange: (value: string) => void;
  onSelectSupply: (target: SupplyTarget) => void;
  onStartHandover: (item: CurrentAssignment) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
  onClearSelectedSupply: () => void;
  search: string;
  selectedSupplySkuIds: string[];
  stockFilter: StockFilter;
  viewMode: ViewMode;
};

export function AssignmentList({
  allItems,
  counts,
  filteredItems,
  locationId,
  locationName,
  moneyProfile,
  onBulkRequestSupply,
  onRequestSupply,
  onSearchChange,
  onSelectSupply,
  onStartHandover,
  onStockFilterChange,
  onViewModeChange,
  onClearSelectedSupply,
  search,
  selectedSupplySkuIds,
  stockFilter,
  viewMode,
}: AssignmentListProps) {
  if (allItems.length === 0) {
    return (
      <AppEmptyState
        description={`No variants are assigned to you at ${locationName ?? "this location"}.`}
        icon={Package}
        kind="no-data"
        title="No assignments yet"
      />
    );
  }

  const hasActiveFilter = stockFilter !== "all" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <AssignmentSummary
        counts={counts}
        itemCount={allItems.length}
        locationName={locationName}
      />
      <AssignmentToolbar
        counts={counts}
        onSearchChange={onSearchChange}
        onStockFilterChange={onStockFilterChange}
        onViewModeChange={onViewModeChange}
        search={search}
        stockFilter={stockFilter}
        viewMode={viewMode}
      />
      {selectedSupplySkuIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="type-support">
            {formatCount(selectedSupplySkuIds.length)} selected for grouped
            request
          </p>
          <Button onClick={onBulkRequestSupply} size="sm" type="button">
            Request Selected
          </Button>
          <Button
            onClick={onClearSelectedSupply}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear Selection
          </Button>
        </div>
      ) : null}
      {hasActiveFilter ? (
        <p className="type-support text-xs">
          {filteredItems.length === 0
            ? "No assignments match your filters."
            : `Showing ${formatCount(filteredItems.length)} of ${formatCount(allItems.length)}`}
        </p>
      ) : null}
      <AssignmentResults
        filteredItems={filteredItems}
        hasActiveFilter={hasActiveFilter}
        locationId={locationId}
        locationName={locationName}
        moneyProfile={moneyProfile}
        onRequestSupply={onRequestSupply}
        onSearchChange={onSearchChange}
        onSelectSupply={onSelectSupply}
        onStartHandover={onStartHandover}
        onStockFilterChange={onStockFilterChange}
        viewMode={viewMode}
        selectedSupplySkuIds={selectedSupplySkuIds}
      />
    </div>
  );
}

function AssignmentResults({
  filteredItems,
  hasActiveFilter,
  locationId,
  locationName,
  moneyProfile,
  onRequestSupply,
  onSearchChange,
  onSelectSupply,
  onStartHandover,
  onStockFilterChange,
  viewMode,
  selectedSupplySkuIds,
}: {
  filteredItems: CurrentAssignment[];
  hasActiveFilter: boolean;
  locationId: string;
  locationName: string | undefined;
  moneyProfile: MoneyProfile;
  onRequestSupply: (target: SupplyTarget) => void;
  onSearchChange: (value: string) => void;
  onSelectSupply: (target: SupplyTarget) => void;
  onStartHandover: (item: CurrentAssignment) => void;
  onStockFilterChange: (value: StockFilter) => void;
  viewMode: ViewMode;
  selectedSupplySkuIds: string[];
}) {
  if (filteredItems.length === 0) {
    return (
      <AppEmptyState
        action={
          hasActiveFilter ? (
            <Button
              onClick={() => {
                onSearchChange("");
                onStockFilterChange("all");
              }}
              size="sm"
              variant="outline"
            >
              Clear filters
            </Button>
          ) : undefined
        }
        description="Try a different search term or stock filter."
        kind="no-results"
        title="No matching assignments"
      />
    );
  }

  if (viewMode === "compact") {
    return (
      <CompactAssignmentList
        items={filteredItems}
        locationId={locationId}
        locationName={locationName ?? "Assigned location"}
        moneyProfile={moneyProfile}
        onSelectSupply={onSelectSupply}
        onRequestSupply={onRequestSupply}
        onStartHandover={onStartHandover}
        selectedSupplySkuIds={selectedSupplySkuIds}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filteredItems.map((item) => (
        <AssignmentCard
          item={item}
          key={item.skuId}
          moneyProfile={moneyProfile}
          onSelectSupply={() =>
            onSelectSupply({
              locationId,
              locationName: locationName ?? "Assigned location",
              productName: item.productName,
              sku: item.sku,
              skuId: item.skuId,
              variantName: item.variantName,
            })
          }
          onRequestSupply={() =>
            onRequestSupply({
              locationId,
              locationName: locationName ?? "Assigned location",
              productName: item.productName,
              sku: item.sku,
              skuId: item.skuId,
              variantName: item.variantName,
            })
          }
          onStartHandover={() => onStartHandover(item)}
          selectedForSupply={selectedSupplySkuIds.includes(item.skuId)}
        />
      ))}
    </div>
  );
}
