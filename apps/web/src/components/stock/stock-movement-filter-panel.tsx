"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { StockFilterSelect } from "@/components/admin/stock/stock-filter-select";
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
import {
  STOCK_MOVEMENT_TYPE_OPTIONS,
  STOCK_SOURCE_TYPE_OPTIONS,
  type StockMovementFilter,
} from "./stock-movement-history.support";

type LocationOption = ReadonlyArray<{ name: string; slug: string }>;

export function StockMovementFilterPanel({
  draftFilter,
  filterId,
  hasFilters,
  locationLocked = false,
  locations = [],
  locationsLoading = false,
  onClear,
  onSubmit,
  resultLabel,
  updateDraft,
}: {
  draftFilter: StockMovementFilter;
  filterId: string;
  hasFilters: boolean;
  locationLocked?: boolean;
  locations?: LocationOption;
  locationsLoading?: boolean;
  onClear: () => void;
  onSubmit: (event: React.FormEvent) => void;
  resultLabel?: ReactNode;
  updateDraft: (patch: Partial<StockMovementFilter>) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={onSubmit}
        >
          {!locationLocked ? (
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
          ) : null}

          <FilterTextInput
            id={`${filterId}-search`}
            label="Search"
            onChange={(q) => updateDraft({ q })}
            placeholder="Product, SKU, or source"
            value={draftFilter.q}
          />
          <FilterTextInput
            id={`${filterId}-sku`}
            label="SKU"
            onChange={(sku) => updateDraft({ sku })}
            placeholder="Exact or partial SKU"
            value={draftFilter.sku}
          />
          <FilterSelect
            id={`${filterId}-movement`}
            label="Movement"
            onChange={(movementType) =>
              updateDraft({
                movementType:
                  movementType as StockMovementFilter["movementType"],
              })
            }
            options={STOCK_MOVEMENT_TYPE_OPTIONS}
            placeholder="All movements"
            value={draftFilter.movementType}
          />
          <FilterSelect
            id={`${filterId}-source`}
            label="Source"
            onChange={(sourceType) => updateDraft({ sourceType })}
            options={STOCK_SOURCE_TYPE_OPTIONS}
            placeholder="All sources"
            value={draftFilter.sourceType}
          />
          <FilterTextInput
            id={`${filterId}-date-from`}
            label="From"
            onChange={(dateFrom) => updateDraft({ dateFrom })}
            type="date"
            value={draftFilter.dateFrom}
          />
          <FilterTextInput
            id={`${filterId}-date-to`}
            label="To"
            onChange={(dateTo) => updateDraft({ dateTo })}
            type="date"
            value={draftFilter.dateTo}
          />
          <div className="flex items-end gap-2">
            <Button className="min-w-24" size="sm" type="submit">
              <Search className="size-3.5" data-icon="inline-start" />
              Query
            </Button>
            {hasFilters ? (
              <Button
                className="min-w-24"
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

function FilterTextInput({
  id,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        onValueChange={(nextValue) =>
          onChange(nextValue === "all" ? "" : nextValue)
        }
        value={value || "all"}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
