"use client";

import type {
  AuthLocationPermissionScope,
  CurrentAssignment,
} from "@shop/contracts";
import { useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { MoneyProfile } from "@/lib/money/format-money";
import {
  PosSaleAssignmentFilters,
  type PosSaleFilterOption,
} from "./pos-sale-assignment-filters";
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
  onRetry: () => void;
  selectedLocationScope: AuthLocationPermissionScope | null;
  setCartSheetOpen: (open: boolean) => void;
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
  onRetry,
  selectedLocationScope,
  setCartSheetOpen,
}: Props) {
  const [search, setSearch] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const brandOptions = useMemo(
    () => getFilterOptions(assignments, "brandSlug", "brandName"),
    [assignments],
  );
  const categoryOptions = useMemo(
    () => getFilterOptions(assignments, "categorySlug", "categoryName"),
    [assignments],
  );
  const filteredAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          assignment.productName.toLowerCase().includes(query) ||
          assignment.variantName.toLowerCase().includes(query) ||
          assignment.sku.toLowerCase().includes(query);
        const matchesBrand = !brandSlug || assignment.brandSlug === brandSlug;
        const matchesCategory =
          !categorySlug || assignment.categorySlug === categorySlug;

        return matchesSearch && matchesBrand && matchesCategory;
      }),
    [assignments, brandSlug, categorySlug, search],
  );

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
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No variants are currently assigned to you at this location.
      </div>
    );
  }

  return (
    <>
      <div className="pb-24 lg:pb-0">
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Your assigned variants
            </p>
            <PosSaleAssignmentFilters
              brandOptions={brandOptions}
              brandSlug={brandSlug}
              categoryOptions={categoryOptions}
              categorySlug={categorySlug}
              onBrandChange={setBrandSlug}
              onCategoryChange={setCategorySlug}
              onClear={() => {
                setSearch("");
                setBrandSlug("");
                setCategorySlug("");
              }}
              onSearchChange={setSearch}
              search={search}
            />
            <div className="divide-y divide-border rounded-md border border-border bg-card">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <VariantRow
                    key={assignment.skuId}
                    assignment={assignment}
                    cartQuantity={
                      cart.find(
                        (item) => item.assignment.skuId === assignment.skuId,
                      )?.quantity ?? 0
                    }
                    inCart={cart.some(
                      (item) => item.assignment.skuId === assignment.skuId,
                    )}
                    moneyProfile={moneyProfile}
                    onAdd={() => onAddToCart(assignment)}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No assigned variants match the current filters.
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
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

function getFilterOptions(
  assignments: readonly CurrentAssignment[],
  valueKey: "brandSlug" | "categorySlug",
  labelKey: "brandName" | "categoryName",
): PosSaleFilterOption[] {
  const options = new Map<string, string>();

  for (const assignment of assignments) {
    const value = assignment[valueKey];
    if (!value) continue;
    options.set(value, assignment[labelKey] ?? value);
  }

  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (left, right) => left.label.localeCompare(right.label),
  );
}
