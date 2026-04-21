"use client";

import type { AdminBrandSummary, AdminCategorySummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => onDraftSearchChange(event.target.value)}
          placeholder="Search by name or slug"
          value={draftSearch}
        />
      </div>
      <ProductFilterSelect
        ariaLabel="Filter by brand"
        disabled={brandsQuery.isPending}
        emptyLabel="All brands"
        items={brandsQuery.data?.items ?? []}
        paramName="brandSlug"
        value={brandSlug}
        onQueryChange={onQueryChange}
      />
      <ProductFilterSelect
        ariaLabel="Filter by category"
        disabled={categoriesQuery.isPending}
        emptyLabel="All categories"
        items={categoriesQuery.data?.items ?? []}
        paramName="categorySlug"
        value={categorySlug}
        onQueryChange={onQueryChange}
      />
      <Select
        aria-label="Filter by status"
        className="h-9"
        onChange={(event) =>
          onQueryChange({
            page: null,
            status: event.target.value === "all" ? null : event.target.value,
          })
        }
        value={status}
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </Select>
      {hasFilters ? (
        <Button
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
          variant="ghost"
        >
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}
      <span className="ml-auto tabular-nums text-sm text-muted-foreground">
        {totalCount} total
      </span>
    </div>
  );
}

function ProductFilterSelect({
  ariaLabel,
  disabled,
  emptyLabel,
  items,
  onQueryChange,
  paramName,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  emptyLabel: string;
  items: Array<AdminBrandSummary | AdminCategorySummary>;
  onQueryChange: (updates: Record<string, number | string | null>) => void;
  paramName: "brandSlug" | "categorySlug";
  value: string;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      className="h-9 min-w-44"
      disabled={disabled}
      onChange={(event) =>
        onQueryChange({
          page: null,
          [paramName]: event.target.value === "all" ? null : event.target.value,
        })
      }
      value={value === "" ? "all" : value}
    >
      <option value="all">{emptyLabel}</option>
      {items.map((item) => (
        <option key={item.slug} value={item.slug}>
          {item.name}
        </option>
      ))}
    </Select>
  );
}
