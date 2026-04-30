"use client";

import { Search, X } from "lucide-react";
import type { Ref } from "react";
import { AppFormField } from "@/components/forms/app-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PosSaleQuickFilter,
  PosSaleSortOption,
} from "./pos-sale-assignment-workspace.support";

export type PosSaleFilterOption = {
  label: string;
  value: string;
};

type Props = {
  brandOptions: readonly PosSaleFilterOption[];
  brandSlug: string;
  categoryOptions: readonly PosSaleFilterOption[];
  categorySlug: string;
  canSubmitPrimaryResult: boolean;
  inputRef?: Ref<HTMLInputElement>;
  quickFilter: PosSaleQuickFilter;
  sort: PosSaleSortOption;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onQuickFilterChange: (value: PosSaleQuickFilter) => void;
  onSearchChange: (value: string) => void;
  onSubmitPrimaryResult: () => void;
  onSortChange: (value: PosSaleSortOption) => void;
  search: string;
};

export function PosSaleAssignmentFilters({
  brandOptions,
  brandSlug,
  canSubmitPrimaryResult,
  categoryOptions,
  categorySlug,
  inputRef,
  quickFilter,
  sort,
  onBrandChange,
  onCategoryChange,
  onClear,
  onQuickFilterChange,
  onSearchChange,
  onSubmitPrimaryResult,
  onSortChange,
  search,
}: Props) {
  const hasFilters = Boolean(search || brandSlug || categorySlug);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
          <AppFormField inputId="pos-sale-search" label="Search">
            <div className="relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                className="h-10 border-border/60 bg-muted/20 pl-10 pr-10 transition-all focus:bg-background focus:ring-primary/20"
                id="pos-sale-search"
                ref={inputRef}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !canSubmitPrimaryResult) {
                    return;
                  }

                  event.preventDefault();
                  onSubmitPrimaryResult();
                }}
                placeholder="Search assigned products"
                value={search}
              />
              {search ? (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors hover:text-foreground"
                  onClick={() => onSearchChange("")}
                  type="button"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </AppFormField>

          <AppFormField inputId="pos-sale-brand" label="Brand">
            <Select value={brandSlug} onValueChange={onBrandChange}>
              <SelectTrigger className="w-full" id="pos-sale-brand">
                <SelectValue placeholder="All brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All brands</SelectItem>
                {brandOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>

          <AppFormField inputId="pos-sale-category" label="Category">
            <Select value={categorySlug} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full" id="pos-sale-category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AppFormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AppFormField inputId="pos-sale-quick-filter" label="View">
            <Select
              value={quickFilter}
              onValueChange={(value) =>
                onQuickFilterChange(value as PosSaleQuickFilter)
              }
            >
              <SelectTrigger className="w-full" id="pos-sale-quick-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assigned</SelectItem>
                <SelectItem value="available">Available only</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="in_cart">Already in cart</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>

          <AppFormField inputId="pos-sale-sort" label="Sort">
            <Select
              value={sort}
              onValueChange={(value) =>
                onSortChange(value as PosSaleSortOption)
              }
            >
              <SelectTrigger className="w-full" id="pos-sale-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="stock_asc">Stock: low to high</SelectItem>
                <SelectItem value="stock_desc">Stock: high to low</SelectItem>
              </SelectContent>
            </Select>
          </AppFormField>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="type-support">
            Search by product, SKU, brand, or category, then narrow by stock
            state or sort order.
            {canSubmitPrimaryResult
              ? " Press Enter in search to add the first available match."
              : ""}
          </p>
          <Button
            className="h-10 w-full border-border/60 bg-background text-xs font-bold hover:bg-muted md:w-auto"
            disabled={!hasFilters && quickFilter === "all" && sort === "name"}
            onClick={onClear}
            size="lg"
            type="button"
            variant="outline"
          >
            <X className="mr-2 size-3.5" />
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
