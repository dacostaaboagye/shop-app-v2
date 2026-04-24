"use client";

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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="relative min-w-64 flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
        <Input
          className="h-10 rounded-xl border-border/60 bg-muted/20 pl-10 pr-10 transition-all focus:bg-background focus:ring-primary/20"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search assigned products"
          value={search}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
            onClick={() => onSearchChange("")}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Select value={brandSlug} onValueChange={onBrandChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
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

      <Select value={categorySlug} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
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

      <Button
        disabled={!hasFilters}
        onClick={onClear}
        size="lg"
        type="button"
        variant="outline"
        className="h-10 rounded-xl border-border/60 bg-card hover:bg-muted font-bold text-xs"
      >
        <X className="size-3.5 mr-2" />
        Clear
      </Button>
    </div>
  );
}
