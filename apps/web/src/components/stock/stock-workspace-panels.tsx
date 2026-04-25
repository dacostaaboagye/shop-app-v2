"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { formatCount } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function StockSearchToolbar({
  activeSearch,
  countLabel,
  onClear,
  onSearchChange,
  onSubmit,
  placeholder,
  search,
}: {
  activeSearch: string;
  countLabel?: ReactNode;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  placeholder: string;
  search: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
          onSubmit={onSubmit}
        >
          <div className="relative min-w-0 flex-1 lg:min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={placeholder}
              value={search}
            />
          </div>
          <Button size="sm" type="submit">
            <Search className="size-3.5" data-icon="inline-start" />
            Search
          </Button>
          {activeSearch ? (
            <Button onClick={onClear} size="sm" type="button" variant="outline">
              <X className="size-3.5" data-icon="inline-start" />
              Clear
            </Button>
          ) : null}
        </form>
        {countLabel ? (
          <div className="flex min-w-0 items-center gap-3 text-right">
            <div
              aria-hidden="true"
              className="hidden h-6 w-px bg-border/60 lg:block"
            />
            <p className="type-support type-inline-metric text-muted-foreground">
              {countLabel}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StockMetricGrid({
  items,
}: {
  items: ReadonlyArray<{
    label: string;
    value: number | string;
  }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <StockMetricCard
          key={item.label}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  );
}

function StockMetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm",
        "transition-shadow hover:shadow-md",
      )}
    >
      <p className="type-data-label text-muted-foreground">{label}</p>
      <p className="type-data-value mt-2 text-foreground">
        {typeof value === "number" ? formatCount(value) : value}
      </p>
    </div>
  );
}
