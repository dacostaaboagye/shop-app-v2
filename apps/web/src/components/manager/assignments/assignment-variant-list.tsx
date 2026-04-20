"use client";

import type { VariantSearchResult } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchManagerVariants,
  variantSearchQueryKey,
} from "@/lib/react-query/catalog-variants";
import { cn } from "@/lib/utils";

type Props = {
  locationId: string;
  onToggle: (variant: VariantSearchResult) => void;
  selectedIds: Set<string>;
};

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6];

export function AssignmentVariantList({
  locationId,
  onToggle,
  selectedIds,
}: Props) {
  const [search, setSearch] = useState("");

  const params = { locationId, q: search.trim(), pageSize: 30 };
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name, variant, or SKU…"
          value={search}
        />
      </div>

      <div className="rounded-md border border-border">
        {searchQuery.isPending ? (
          <div className="divide-y divide-border">
            {SKELETON_KEYS.map((k) => (
              <div className="flex items-center gap-3 px-4 py-3" key={k}>
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
          <p className="p-4 text-sm text-destructive">
            Failed to load variants. Please try again.
          </p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {search.trim()
              ? `No variants matching "${search}" are stocked at this location.`
              : "No stock has been recorded at this location yet."}
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((variant) => {
              const isChecked = selectedIds.has(variant.variantId);
              return (
                <li key={variant.variantId}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                      isChecked && "bg-primary/5",
                    )}
                  >
                    <input
                      checked={isChecked}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                      onChange={() => onToggle(variant)}
                      type="checkbox"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {variant.productName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {variant.name} &middot; {variant.sku}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums">
                        {variant.sellingPrice}
                      </p>
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          variant.onHandQuantity <= 5
                            ? "text-warning-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {variant.onHandQuantity} in stock
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {searchQuery.data && searchQuery.data.total > 30 && (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            Showing first 30 results — refine your search to find more.
          </p>
        )}
      </div>
    </div>
  );
}
