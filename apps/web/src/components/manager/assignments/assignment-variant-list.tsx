"use client";

import type { VariantSearchResult } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/display/format";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import {
  fetchManagerVariants,
  variantSearchQueryKey,
} from "@/lib/react-query/catalog-variants";
import { cn } from "@/lib/utils";

type Props = {
  locationId: string;
  moneyProfile: MoneyProfile;
  onToggle: (variant: VariantSearchResult) => void;
  selectedIds: Set<string>;
};

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6] as const;

export function AssignmentVariantList({
  locationId,
  moneyProfile,
  onToggle,
  selectedIds,
}: Props) {
  const [search, setSearch] = useState("");

  const params = { locationId, pageSize: 30, q: search.trim() };
  const searchQuery = useQuery({
    queryFn: () => fetchManagerVariants(params),
    queryKey: variantSearchQueryKey(params),
    staleTime: 15_000,
  });

  const items = searchQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by product name, variant, or SKU..."
          value={search}
        />
      </div>

      <div className="rounded-md border border-border">
        {searchQuery.isPending ? (
          <div className="divide-y divide-border">
            {SKELETON_KEYS.map((key) => (
              <div className="flex items-center gap-3 px-4 py-3" key={key}>
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        ) : searchQuery.isError ? (
          <div className="p-4">
            <AppErrorBanner
              error={searchQuery.error}
              title="Variants could not be loaded"
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <AppEmptyState
              description={
                search.trim()
                  ? `No variants matching "${search}" are stocked at this location.`
                  : "No stock has been recorded at this location yet."
              }
              kind={search.trim() ? "no-results" : "no-data"}
              title={
                search.trim() ? "No matching variants" : "No stock recorded"
              }
            />
          </div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((variant) => {
              const isChecked = selectedIds.has(variant.variantId);

              return (
                <li key={variant.variantId}>
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40 sm:items-center",
                      isChecked && "bg-primary/5",
                    )}
                  >
                    <input
                      aria-label={`Select ${variant.productName} - ${variant.name}`}
                      checked={isChecked}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                      onChange={() => onToggle(variant)}
                      type="checkbox"
                    />
                    <ProductThumbnail
                      className="size-10 shrink-0"
                      imageUrl={variant.primaryImageUrl}
                      productName={variant.productName}
                      variantName={variant.name}
                    />
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onToggle(variant)}
                      type="button"
                    >
                      <p className="text-balance text-sm font-medium leading-snug">
                        {variant.productName}
                      </p>
                      <p className="type-support text-pretty">
                        {variant.name} | {variant.sku}
                      </p>
                    </button>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-sm tabular-nums">
                        {formatMoney(variant.sellingPrice, moneyProfile)}
                      </p>
                      <p
                        className={cn(
                          "type-support text-xs tabular-nums",
                          variant.onHandQuantity <= 5
                            ? "text-warning-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatCount(variant.onHandQuantity)} in stock
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {searchQuery.data && searchQuery.data.total > 30 ? (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Showing first 30 results. Refine your search to find more.
          </p>
        ) : null}
      </div>
    </div>
  );
}
