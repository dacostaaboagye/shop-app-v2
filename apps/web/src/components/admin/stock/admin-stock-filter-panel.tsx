"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { StockBalanceFilter } from "@/app/admin/stock/balances/page.support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCount } from "@/lib/display/format";
import { StockFilterSelect } from "./stock-filter-select";

type FilterOption = ReadonlyArray<{ name: string; slug: string }>;

export function AdminStockFilterPanel({
  brands,
  brandsLoading,
  categories,
  categoriesLoading,
  draftFilter,
  filterId,
  hasFilters,
  locations,
  locationsLoading,
  onClear,
  onSubmit,
  resultLabel,
  updateDraft,
}: {
  brands: FilterOption;
  brandsLoading: boolean;
  categories: FilterOption;
  categoriesLoading: boolean;
  draftFilter: StockBalanceFilter;
  filterId: string;
  hasFilters: boolean;
  locations: FilterOption;
  locationsLoading: boolean;
  onClear: () => void;
  onSubmit: (event: React.FormEvent) => void;
  resultLabel?: ReactNode;
  updateDraft: (patch: Partial<StockBalanceFilter>) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
          <StockFilterSelect
            id={`${filterId}-location`}
            isLoading={locationsLoading}
            label="Location"
            loadingLabel="Loading locations..."
            onChange={(locationSlug) => updateDraft({ locationSlug })}
            options={locations}
            placeholder="All locations"
            value={draftFilter.locationSlug}
          />
          <StockFilterSelect
            id={`${filterId}-brand`}
            isLoading={brandsLoading}
            label="Brand"
            loadingLabel="Loading brands..."
            onChange={(brandSlug) => updateDraft({ brandSlug })}
            options={brands}
            placeholder="All brands"
            value={draftFilter.brandSlug}
          />
          <StockFilterSelect
            id={`${filterId}-category`}
            isLoading={categoriesLoading}
            label="Category"
            loadingLabel="Loading categories..."
            onChange={(categorySlug) => updateDraft({ categorySlug })}
            options={categories}
            placeholder="All categories"
            value={draftFilter.categorySlug}
          />
          <div className="flex min-w-52 flex-1 flex-col gap-1.5">
            <Label htmlFor={`${filterId}-search`}>Search</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                id={`${filterId}-search`}
                onChange={(event) => updateDraft({ q: event.target.value })}
                placeholder="Product name or SKU"
                value={draftFilter.q}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" type="submit">
              <Search className="size-3.5" data-icon="inline-start" />
              Query
            </Button>
            {hasFilters ? (
              <Button
                onClick={onClear}
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
          </div>
        </form>
        {resultLabel ? (
          <p className="type-support type-inline-metric text-muted-foreground">
            {resultLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function formatAdminStockResultLabel({
  count,
  emptyLabel,
  locationName,
}: {
  count: number;
  emptyLabel: string;
  locationName?: string | null;
}) {
  const countText = formatCount(count);
  return locationName
    ? `${countText} ${emptyLabel}${count !== 1 ? "s" : ""} at ${locationName}`
    : `${countText} ${emptyLabel}${count !== 1 ? "s" : ""} across all locations`;
}
