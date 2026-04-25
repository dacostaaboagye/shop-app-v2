"use client";

import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";

export function SupplyRequestFilterSummary({
  filteredCount,
  totalCount,
}: {
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <p className="type-support">
      {filteredCount === 0
        ? "No requests match your filters."
        : `Showing ${filteredCount} of ${totalCount}`}
    </p>
  );
}

export function SupplyRequestNoResults({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
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
