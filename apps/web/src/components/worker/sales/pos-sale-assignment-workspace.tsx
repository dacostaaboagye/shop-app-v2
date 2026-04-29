"use client";

import type {
  AuthLocationPermissionScope,
  CurrentAssignment,
} from "@shop/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/display/format";
import type { MoneyProfile } from "@/lib/money/format-money";
import { PosSaleAssignmentFilters } from "./pos-sale-assignment-filters";
import {
  filterSaleAssignments,
  getFirstAddableSaleAssignment,
  getSaleAssignmentFilterOptions,
  getSaleAssignmentSearchMatchState,
  isLikelySkuSearch,
  type PosSaleQuickFilter,
  type PosSaleSortOption,
  paginateSaleAssignments,
  summarizeSaleAssignments,
} from "./pos-sale-assignment-workspace.support";
import {
  type CartBodyProps,
  type CartItem,
  PosSaleCartCard,
} from "./pos-sale-cart-card";
import { PosSaleMobileCart } from "./pos-sale-mobile-cart";
import { VariantRow } from "./pos-sale-page-sections";

type Props = {
  assignments: CurrentAssignment[];
  cart: CartItem[];
  cartProps: CartBodyProps;
  cartSheetOpen: boolean;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
  moneyProfile: MoneyProfile;
  onAddToCart: (assignment: CurrentAssignment) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onQuickFilterChange: (value: PosSaleQuickFilter) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: PosSaleSortOption) => void;
  page: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  quickFilter: PosSaleQuickFilter;
  search: string;
  selectedLocationScope: AuthLocationPermissionScope | null;
  setCartSheetOpen: (open: boolean) => void;
  sort: PosSaleSortOption;
  brandSlug: string;
  categorySlug: string;
};

export function PosSaleAssignmentWorkspace({
  assignments,
  cart,
  cartProps,
  cartSheetOpen,
  error,
  isError,
  isPending,
  moneyProfile,
  onAddToCart,
  onBrandChange,
  onCategoryChange,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
  onQuickFilterChange,
  onRetry,
  onSearchChange,
  onSortChange,
  page,
  pageSize,
  pageSizeOptions,
  quickFilter,
  search,
  selectedLocationScope,
  setCartSheetOpen,
  sort,
  brandSlug,
  categorySlug,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<{
    quantity: number;
    skuId: string;
  } | null>(null);
  const brandOptions = useMemo(
    () => getSaleAssignmentFilterOptions(assignments, "brandSlug", "brandName"),
    [assignments],
  );
  const categoryOptions = useMemo(
    () =>
      getSaleAssignmentFilterOptions(
        assignments,
        "categorySlug",
        "categoryName",
      ),
    [assignments],
  );
  const filteredAssignments = useMemo(
    () =>
      filterSaleAssignments(
        assignments,
        {
          brandSlug,
          categorySlug,
          quickFilter,
          search,
          sort,
        },
        cart.map((item) => item.assignment.skuId),
      ),
    [assignments, brandSlug, cart, categorySlug, quickFilter, search, sort],
  );
  const assignmentSummary = useMemo(
    () =>
      summarizeSaleAssignments(
        assignments,
        cart.map((item) => item.assignment.skuId),
      ),
    [assignments, cart],
  );
  const paginatedAssignments = useMemo(
    () => paginateSaleAssignments(filteredAssignments, page, pageSize),
    [filteredAssignments, page, pageSize],
  );
  const firstAddableAssignment = useMemo(
    () => getFirstAddableSaleAssignment(paginatedAssignments),
    [paginatedAssignments],
  );
  const searchMatchState = useMemo(
    () => getSaleAssignmentSearchMatchState(filteredAssignments, search),
    [filteredAssignments, search],
  );
  const isSkuSearch = useMemo(() => isLikelySkuSearch(search), [search]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / pageSize),
  );

  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [onPageChange, page, totalPages]);

  useEffect(() => {
    if (!recentlyAdded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentlyAdded((current) =>
        current?.skuId === recentlyAdded.skuId ? null : current,
      );
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [recentlyAdded]);

  function focusSearchInput() {
    const input = searchInputRef.current;

    if (!input) {
      return;
    }

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function handleAddAssignment(assignment: CurrentAssignment) {
    const currentQuantity =
      cart.find((item) => item.assignment.skuId === assignment.skuId)
        ?.quantity ?? 0;
    const nextQuantity = Math.min(
      currentQuantity + 1,
      assignment.availableQuantity,
    );

    onAddToCart(assignment);
    setRecentlyAdded({ quantity: nextQuantity, skuId: assignment.skuId });

    if (isSkuSearch) {
      onSearchChange("");
    }

    focusSearchInput();
  }

  if (isPending && selectedLocationScope) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <AppErrorBanner
        detail="Could not load your assigned variants."
        error={error}
        onRetry={onRetry}
        title="Unable to load variants"
      />
    );
  }

  if (!selectedLocationScope) return null;

  if (assignments.length === 0) {
    return (
      <AppEmptyState
        description="No sale-ready variants are currently assigned to you at this location."
        title="No assigned variants"
      />
    );
  }

  return (
    <>
      <div className="pb-24 lg:pb-0">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <div className="min-w-0 flex flex-col gap-3">
            <Card className="overflow-hidden rounded-xl border border-border bg-card py-0 shadow-sm">
              <CardHeader className="gap-2 p-5 pb-4">
                <CardTitle className="text-base">Available variants</CardTitle>
                <CardDescription className="leading-relaxed">
                  {formatCount(filteredAssignments.length)} of{" "}
                  {formatCount(assignments.length)} assigned variants ready for
                  sale.
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
                      handleAddAssignment(firstAddableAssignment);
                    }
                  }}
                  onSortChange={onSortChange}
                  quickFilter={quickFilter}
                  search={search}
                  sort={sort}
                />
                {searchMatchState ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <Badge className="rounded-lg border-none bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shadow-none">
                      {searchMatchState.kind === "exact_sku"
                        ? "Exact SKU match"
                        : "Closest SKU match"}
                    </Badge>
                    <p className="text-sm font-medium text-foreground">
                      {searchMatchState.assignment.sku}
                    </p>
                    <p className="type-support">
                      {searchMatchState.assignment.productName}
                    </p>
                    <Badge
                      className={
                        searchMatchState.assignment.availableQuantity > 0
                          ? "rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-none"
                          : "rounded-lg border-none bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-none"
                      }
                    >
                      {searchMatchState.assignment.availableQuantity > 0
                        ? `${formatCount(searchMatchState.assignment.availableQuantity)} available`
                        : "Out of stock"}
                    </Badge>
                    {recentlyAdded?.skuId ===
                    searchMatchState.assignment.skuId ? (
                      <Badge className="rounded-lg border-none bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow-none">
                        Added. {formatCount(recentlyAdded.quantity)} now in cart
                      </Badge>
                    ) : null}
                  </div>
                ) : isSkuSearch ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2">
                    <Badge className="rounded-lg border-none bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-none">
                      No SKU match
                    </Badge>
                    <p className="text-sm font-medium text-foreground">
                      {search.trim()}
                    </p>
                    <p className="type-support">
                      No assigned variant matches this scan at the current location.
                    </p>
                  </div>
                ) : null}
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="divide-y divide-border">
                    {paginatedAssignments.length > 0 ? (
                      paginatedAssignments.map((assignment) => (
                        <VariantRow
                          key={assignment.skuId}
                          assignment={assignment}
                          cartQuantity={
                            cart.find(
                              (item) =>
                                item.assignment.skuId === assignment.skuId,
                            )?.quantity ?? 0
                          }
                          isPrimarySearchMatch={
                            searchMatchState?.assignment.skuId ===
                            assignment.skuId
                          }
                          isRecentlyAdded={
                            recentlyAdded?.skuId === assignment.skuId
                          }
                          inCart={cart.some(
                            (item) =>
                              item.assignment.skuId === assignment.skuId,
                          )}
                          moneyProfile={moneyProfile}
                          onAdd={() => handleAddAssignment(assignment)}
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
                {filteredAssignments.length > 0 ? (
                  <AppPagination
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={pageSizeOptions}
                    totalCount={filteredAssignments.length}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
          <div className="hidden min-w-0 xl:block">
            <div className="sticky top-20">
              <PosSaleCartCard {...cartProps} />
            </div>
          </div>
          <div className="hidden min-w-0 lg:block xl:hidden">
            <PosSaleCartCard {...cartProps} />
          </div>
        </div>
      </div>

      <PosSaleMobileCart
        {...cartProps}
        onOpenChange={setCartSheetOpen}
        open={cartSheetOpen}
      />
    </>
  );
}

function SummaryButton({
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
