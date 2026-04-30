"use client";

import type {
  AuthLocationPermissionScope,
  CurrentAssignment,
} from "@shop/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { MoneyProfile } from "@/lib/money/format-money";
import { PosSaleAssignmentCatalogCard } from "./pos-sale-assignment-workspace.sections";
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
            <PosSaleAssignmentCatalogCard
              assignmentSummary={assignmentSummary}
              brandOptions={brandOptions}
              brandSlug={brandSlug}
              cart={cart}
              categoryOptions={categoryOptions}
              categorySlug={categorySlug}
              filteredCount={filteredAssignments.length}
              firstAddableAssignment={firstAddableAssignment}
              moneyProfile={moneyProfile}
              onAddAssignment={handleAddAssignment}
              onBrandChange={onBrandChange}
              onCategoryChange={onCategoryChange}
              onClearFilters={onClearFilters}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onQuickFilterChange={onQuickFilterChange}
              onSearchChange={onSearchChange}
              onSortChange={onSortChange}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              paginatedAssignments={paginatedAssignments}
              quickFilter={quickFilter}
              recentlyAdded={recentlyAdded}
              search={isSkuSearch ? search : ""}
              searchInputRef={searchInputRef}
              searchMatchState={searchMatchState}
              selectedLocationScope={selectedLocationScope}
              sort={sort}
            />
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
