"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type PosSaleFilterOption = {
  label: string;
  value: string;
};

type Props = {
  brandOptions: readonly PosSaleFilterOption[];
  brandSlug: string;
  categoryOptions: readonly PosSaleFilterOption[];
  categorySlug: string;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  search: string;
};

export function PosSaleAssignmentFilters({
  brandOptions,
  brandSlug,
  categoryOptions,
  categorySlug,
  onBrandChange,
  onCategoryChange,
  onClear,
  onSearchChange,
  search,
}: Props) {
  const hasFilters = Boolean(search || brandSlug || categorySlug);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search assigned products"
          value={search}
        />
      </div>
      <Select
        aria-label="Filter assigned products by brand"
        className="h-9"
        onChange={(event) => onBrandChange(event.target.value)}
        value={brandSlug}
      >
        <option value="">All brands</option>
        {brandOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter assigned products by category"
        className="h-9"
        onChange={(event) => onCategoryChange(event.target.value)}
        value={categorySlug}
      >
        <option value="">All categories</option>
        {categoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button
        disabled={!hasFilters}
        onClick={onClear}
        size="sm"
        type="button"
        variant="outline"
      >
        <X data-icon="inline-start" />
        Clear
      </Button>
    </div>
  );
}
