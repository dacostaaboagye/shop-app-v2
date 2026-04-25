"use client";

import type { AdminBrandSummary, AdminCategorySummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";

type ProductFiltersProps = {
  brandSlug: string;
  categorySlug: string;
  draftSearch: string;
  hasFilters: boolean;
  onDraftSearchChange: (value: string) => void;
  onQueryChange: (updates: Record<string, number | string | null>) => void;
  status: string;
  totalCount: number;
};

const FILTER_OPTION_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function ProductFilters({
  brandSlug,
  categorySlug,
  draftSearch,
  hasFilters,
  onDraftSearchChange,
  onQueryChange,
  status,
  totalCount,
}: ProductFiltersProps) {
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(FILTER_OPTION_QUERY),
    queryKey: adminBrandsQueryKey(FILTER_OPTION_QUERY),
    staleTime: 5 * 60_000,
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(FILTER_OPTION_QUERY),
    queryKey: adminCategoriesQueryKey(FILTER_OPTION_QUERY),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="product-filter-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                id="product-filter-search"
                onChange={(event) => onDraftSearchChange(event.target.value)}
                placeholder="Product name or slug"
                value={draftSearch}
              />
            </div>
          </div>
          <ProductFilterSelect
            disabled={brandsQuery.isPending}
            emptyLabel="All brands"
            items={brandsQuery.data?.items ?? []}
            label="Brand"
            onQueryChange={onQueryChange}
            paramName="brandSlug"
            value={brandSlug}
          />
          <ProductFilterSelect
            disabled={categoriesQuery.isPending}
            emptyLabel="All categories"
            items={categoriesQuery.data?.items ?? []}
            label="Category"
            onQueryChange={onQueryChange}
            paramName="categorySlug"
            value={categorySlug}
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="product-filter-status">Status</Label>
            <Select
              onValueChange={(value) =>
                onQueryChange({
                  page: null,
                  status: value === "all" ? null : value,
                })
              }
              value={status || "all"}
            >
              <SelectTrigger className="h-10 w-full" id="product-filter-status">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 items-end">
            {hasFilters ? (
              <Button
                className="w-full lg:w-auto"
                onClick={() =>
                  onQueryChange({
                    brandSlug: null,
                    categorySlug: null,
                    page: null,
                    q: null,
                    status: null,
                  })
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <X className="size-3.5" data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <p className="type-support type-inline-metric text-muted-foreground">
          {formatCount(totalCount)} products
          {status !== "all" ? ` in ${status}` : ""}
          {brandSlug || categorySlug || draftSearch
            ? " matching the current filters"
            : " across the catalogue"}
        </p>
      </div>
    </div>
  );
}

function ProductFilterSelect({
  disabled,
  emptyLabel,
  items,
  label,
  onQueryChange,
  paramName,
  value,
}: {
  disabled: boolean;
  emptyLabel: string;
  items: Array<AdminBrandSummary | AdminCategorySummary>;
  label: string;
  onQueryChange: (updates: Record<string, number | string | null>) => void;
  paramName: "brandSlug" | "categorySlug";
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        disabled={disabled}
        onValueChange={(val) =>
          onQueryChange({
            page: null,
            [paramName]: val === "all" ? null : val,
          })
        }
        value={value === "" ? "all" : value}
      >
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder={emptyLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{emptyLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
