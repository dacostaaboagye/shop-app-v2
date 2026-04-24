"use client";

import { useState } from "react";
import { useActiveLocationStore } from "@/store/use-active-location-store";

export const STOCK_BALANCE_LOCATIONS_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "all" as const,
  type: "all" as const,
};

export type StockBalanceFilter = {
  brandSlug: string;
  categorySlug: string;
  locationSlug: string;
  q: string;
};

export const STOCK_BALANCE_DEFAULT_FILTER: StockBalanceFilter = {
  brandSlug: "",
  categorySlug: "",
  locationSlug: "",
  q: "",
};

export function createStockBalanceFilter(
  locationSlug: string | null = null,
): StockBalanceFilter {
  return {
    ...STOCK_BALANCE_DEFAULT_FILTER,
    locationSlug: locationSlug ?? "",
  };
}

export const STOCK_CATALOG_FILTER_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export const STOCK_BALANCE_SKELETON_KEYS = [
  "sb-1",
  "sb-2",
  "sb-3",
  "sb-4",
  "sb-5",
] as const;

export function getStockBalanceLocationName(
  locationSlug: string,
  stockLocationName: string | null | undefined,
  locations: ReadonlyArray<{ name: string; slug: string }> | undefined,
): string {
  return (
    stockLocationName ??
    locations?.find((location) => location.slug === locationSlug)?.name ??
    locationSlug
  );
}

export function hasStockBalanceFilter(filter: StockBalanceFilter): boolean {
  return Boolean(
    filter.brandSlug || filter.categorySlug || filter.locationSlug || filter.q,
  );
}

export function useStockBalanceFilter() {
  const setActiveLocationSlug = useActiveLocationStore(
    (state) => state.setSelectedLocationSlug,
  );
  const [draftFilter, setDraftFilter] = useState<StockBalanceFilter>(() =>
    createStockBalanceFilter(),
  );
  const [filter, setFilter] = useState<StockBalanceFilter>(() =>
    createStockBalanceFilter(),
  );

  function updateDraft(patch: Partial<StockBalanceFilter>) {
    if (Object.hasOwn(patch, "locationSlug")) {
      if (patch.locationSlug) {
        setActiveLocationSlug(patch.locationSlug);
      }
    }

    setDraftFilter((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (draftFilter.locationSlug) {
      setActiveLocationSlug(draftFilter.locationSlug);
    }
    setFilter({ ...draftFilter, q: draftFilter.q.trim() });
  }

  function handleClear() {
    setDraftFilter(STOCK_BALANCE_DEFAULT_FILTER);
    setFilter(STOCK_BALANCE_DEFAULT_FILTER);
  }

  return {
    draftFilter,
    filter,
    handleClear,
    handleSubmit,
    hasFilters: hasStockBalanceFilter(filter),
    updateDraft,
  };
}
