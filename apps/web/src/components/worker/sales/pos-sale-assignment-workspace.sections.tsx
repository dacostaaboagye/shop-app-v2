"use client";

import type {
  AuthLocationPermissionScope,
  CurrentAssignment,
} from "@shop/contracts";
import type { RefObject } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCount } from "@/lib/display/format";
import type { MoneyProfile } from "@/lib/money/format-money";
import { PosSaleAssignmentFilters } from "./pos-sale-assignment-filters";
import { SaleAssignmentMatchNotice } from "./pos-sale-assignment-workspace.match-notice";
import type {
  PosSaleQuickFilter,
  PosSaleSortOption,
} from "./pos-sale-assignment-workspace.support";
import { VariantRow } from "./pos-sale-page-sections";

export function PosSaleAssignmentCatalogCard({
  assignmentSummary,
  brandOptions,
  brandSlug,
  cart,
  categoryOptions,
  categorySlug,
  filteredCount,
  firstAddableAssignment,
  moneyProfile,
  onAddAssignment,
  onBrandChange,
  onCategoryChange,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
  onQuickFilterChange,
  onSearchChange,
  onSortChange,
  page,
  pageSize,
  pageSizeOptions,
  paginatedAssignments,
  quickFilter,
  recentlyAdded,
  search,
  searchInputRef,
  searchMatchState,
  selectedLocationScope,
  sort,
}: {
  assignmentSummary: {
    availableCount: number;
    inCartCount: number;
    lowStockCount: number;
    totalCount: number;
  };
  brandOptions: Array<{ label: string; value: string }>;
  brandSlug: string;
  cart: Array<{ assignment: CurrentAssignment; quantity: number }>;
  categoryOptions: Array<{ label: string; value: string }>;
  categorySlug: string;
  filteredCount: number;
  firstAddableAssignment: CurrentAssignment | null;
  moneyProfile: MoneyProfile;
  onAddAssignment: (assignment: CurrentAssignment) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onQuickFilterChange: (value: PosSaleQuickFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: PosSaleSortOption) => void;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  paginatedAssignments: CurrentAssignment[];
  quickFilter: PosSaleQuickFilter;
  recentlyAdded: { quantity: number; skuId: string } | null;
  search: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchMatchState: {
    assignment: CurrentAssignment;
    kind: "exact_sku" | "prefix_sku";
  } | null;
  selectedLocationScope: AuthLocationPermissionScope;
  sort: PosSaleSortOption;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card py-0 shadow-sm">
      <CardHeader className="gap-2 p-5 pb-4">
        <CardTitle className="text-base">Available variants</CardTitle>
        <CardDescription className="leading-relaxed">
          {formatCount(filteredCount)} of{" "}
          {formatCount(assignmentSummary.totalCount)} assigned variants ready
          for sale at {selectedLocationScope.locationName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryButton
            description="All assigned"
            isActive={quickFilter === "all"}
            onClick={() => onQuickFilterChange("all")}
            title="Assigned"
            value={assignmentSummary.totalCount}
          />
          <SummaryButton
            description="Ready to sell"
            isActive={quickFilter === "available"}
            onClick={() => onQuickFilterChange("available")}
            title="Available"
            value={assignmentSummary.availableCount}
          />
          <SummaryButton
            description="Needs attention"
            isActive={quickFilter === "low_stock"}
            onClick={() => onQuickFilterChange("low_stock")}
            title="Low stock"
            value={assignmentSummary.lowStockCount}
          />
          <SummaryButton
            description="Selected now"
            isActive={quickFilter === "in_cart"}
            onClick={() => onQuickFilterChange("in_cart")}
            title="In cart"
            value={assignmentSummary.inCartCount}
          />
        </div>
        <PosSaleAssignmentFilters
          brandOptions={brandOptions}
          brandSlug={brandSlug}
          canSubmitPrimaryResult={firstAddableAssignment !== null}
          categoryOptions={categoryOptions}
          categorySlug={categorySlug}
          inputRef={searchInputRef}
          onBrandChange={onBrandChange}
          onCategoryChange={onCategoryChange}
          onClear={onClearFilters}
          onQuickFilterChange={onQuickFilterChange}
          onSearchChange={onSearchChange}
          onSubmitPrimaryResult={() => {
            if (firstAddableAssignment) {
              onAddAssignment(firstAddableAssignment);
            }
          }}
          onSortChange={onSortChange}
          quickFilter={quickFilter}
          search={search}
          sort={sort}
        />
        <SaleAssignmentMatchNotice
          recentlyAdded={recentlyAdded}
          search={search}
          searchMatchState={searchMatchState}
        />
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="divide-y divide-border">
            {paginatedAssignments.length > 0 ? (
              paginatedAssignments.map((assignment) => (
                <VariantRow
                  key={assignment.skuId}
                  assignment={assignment}
                  cartQuantity={
                    cart.find(
                      (item) => item.assignment.skuId === assignment.skuId,
                    )?.quantity ?? 0
                  }
                  isPrimarySearchMatch={
                    searchMatchState?.assignment.skuId === assignment.skuId
                  }
                  isRecentlyAdded={recentlyAdded?.skuId === assignment.skuId}
                  inCart={cart.some(
                    (item) => item.assignment.skuId === assignment.skuId,
                  )}
                  moneyProfile={moneyProfile}
                  onAdd={() => onAddAssignment(assignment)}
                />
              ))
            ) : (
              <div className="p-6">
                <AppEmptyState
                  description="Try changing the search, brand, or category filters."
                  title="No assigned variants match"
                />
              </div>
            )}
          </div>
        </div>
        {filteredCount > 0 ? (
          <AppPagination
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalCount={filteredCount}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SummaryButton({
  description,
  isActive,
  onClick,
  title,
  value,
}: {
  description: string;
  isActive: boolean;
  onClick: () => void;
  title: string;
  value: number;
}) {
  return (
    <Button
      className="h-auto min-h-24 flex-col items-start gap-1 rounded-xl border-border/60 px-4 py-4 text-left shadow-sm"
      onClick={onClick}
      type="button"
      variant={isActive ? "secondary" : "outline"}
    >
      <span className="type-data-label">{title}</span>
      <span className="type-stat-value text-foreground">
        {formatCount(value)}
      </span>
      <span className="type-support">{description}</span>
    </Button>
  );
}
