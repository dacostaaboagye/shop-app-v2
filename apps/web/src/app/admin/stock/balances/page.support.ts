"use client";

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
  locationSlug: string;
  q: string;
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
