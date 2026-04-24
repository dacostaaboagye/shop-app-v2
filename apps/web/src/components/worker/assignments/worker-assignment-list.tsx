"use client";

import type { CurrentAssignment } from "@shop/contracts";
import { AlertCircle, Package } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MoneyProfile } from "@/lib/money/format-money";
import { AssignmentCard } from "./worker-assignment-cards";
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
  onRequestSupply: (target: SupplyTarget) => void;
  onSearchChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onViewModeChange: (value: ViewMode) => void;
  search: string;
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
  onRequestSupply,
  onSearchChange,
  onStockFilterChange,
  onViewModeChange,
  search,
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
      {hasActiveFilter ? (
        <p className="text-xs text-muted-foreground">
          {filteredItems.length === 0
            ? "No assignments match your filters."
            : `Showing ${filteredItems.length} of ${allItems.length}`}
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
        onStockFilterChange={onStockFilterChange}
        viewMode={viewMode}
      />
    </div>
  );
}

function AssignmentSummary({
  counts,
  itemCount,
  locationName,
}: {
  counts: Record<StockFilter, number>;
  itemCount: number;
  locationName: string | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {locationName ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{itemCount}</span>{" "}
          variant{itemCount !== 1 ? "s" : ""} at{" "}
          <span className="font-medium text-foreground">{locationName}</span>
        </p>
      ) : null}
      {counts.out_of_stock > 0 ? (
        <Badge className="gap-1" variant="destructive">
          <AlertCircle className="size-3" />
          {counts.out_of_stock} out
        </Badge>
      ) : null}
      {counts.low_stock > 0 ? (
        <Badge variant="outline">{counts.low_stock} low</Badge>
      ) : null}
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
  onStockFilterChange,
  viewMode,
}: {
  filteredItems: CurrentAssignment[];
  hasActiveFilter: boolean;
  locationId: string;
  locationName: string | undefined;
  moneyProfile: MoneyProfile;
  onRequestSupply: (target: SupplyTarget) => void;
  onSearchChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  viewMode: ViewMode;
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
        onRequestSupply={onRequestSupply}
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
        />
      ))}
    </div>
  );
}
