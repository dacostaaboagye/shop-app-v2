"use client";

import type { AdminBrandSummary, AdminCategorySummary } from "@shop/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-white p-4 shadow-sm">
      <div className="relative min-w-[320px] w-full flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl border-0 bg-muted pl-10 transition-all focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20"
          onChange={(event) => onDraftSearchChange(event.target.value)}
          placeholder="Search by name or slug"
          value={draftSearch}
        />
      </div>
      <div className="grid w-full gap-2 md:grid-cols-3">
        <ProductFilterSelect
          disabled={brandsQuery.isPending}
          emptyLabel="All brands"
          items={brandsQuery.data?.items ?? []}
          onQueryChange={onQueryChange}
          paramName="brandSlug"
          value={brandSlug}
        />
        <ProductFilterSelect
          disabled={categoriesQuery.isPending}
          emptyLabel="All categories"
          items={categoriesQuery.data?.items ?? []}
          onQueryChange={onQueryChange}
          paramName="categorySlug"
          value={categorySlug}
        />
        <Select
          onValueChange={(value) =>
            onQueryChange({
              page: null,
              status: value === "all" ? null : value,
            })
          }
          value={status || "all"}
        >
          <SelectTrigger className="h-10 min-w-[140px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilters ? (
        <Button
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground hover:bg-muted"
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
          <X className="mr-2 size-4" />
          Clear filters
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        <div className="h-4 w-px bg-border" />
        <span className="text-sm tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          products
        </span>
      </div>
    </div>
  );
}

function ProductFilterSelect({
  disabled,
  emptyLabel,
  items,
  onQueryChange,
  paramName,
  value,
}: {
  disabled: boolean;
  emptyLabel: string;
  items: Array<AdminBrandSummary | AdminCategorySummary>;
  onQueryChange: (updates: Record<string, number | string | null>) => void;
  paramName: "brandSlug" | "categorySlug";
  value: string;
}) {
  return (
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
      <SelectTrigger className="h-10 min-w-[180px]">
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
  );
}
