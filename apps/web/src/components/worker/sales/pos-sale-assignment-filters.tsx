"use client";

import { Search, X } from "lucide-react";
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
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px] xl:items-end">
          <AppFormField inputId="pos-sale-search" label="Search">
            <div className="relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                className="h-10 border-border/60 bg-muted/20 pl-10 pr-10 transition-all focus:bg-background focus:ring-primary/20"
                id="pos-sale-search"
                onChange={(event) => onSearchChange(event.target.value)}
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

        <div className="flex justify-stretch md:justify-end">
          <Button
            className="h-10 w-full border-border/60 bg-background text-xs font-bold hover:bg-muted md:w-auto"
            disabled={!hasFilters}
            onClick={onClear}
            size="lg"
            type="button"
            variant="outline"
          >
            <X className="mr-2 size-3.5" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
