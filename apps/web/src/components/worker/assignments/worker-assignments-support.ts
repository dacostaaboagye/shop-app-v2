import type { CurrentAssignment } from "@shop/contracts";
import { formatCount } from "@/lib/display/format";

export type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type ViewMode = "card" | "compact";

export type SupplyTarget = {
  locationId: string;
  locationName: string;
  productName: string;
  sku: string;
  skuId: string;
  variantName: string;
};

export const FILTER_OPTIONS: { label: string; value: StockFilter }[] = [
  { label: "All", value: "all" },
  { label: "In stock", value: "in_stock" },
  { label: "Low stock", value: "low_stock" },
  { label: "Out", value: "out_of_stock" },
];

export function getStockStatus(
  available: number,
): "in_stock" | "low_stock" | "out_of_stock" {
  if (available === 0) return "out_of_stock";
  if (available <= 3) return "low_stock";
  return "in_stock";
}

export function getAssignmentCounts(items: CurrentAssignment[]) {
  return {
    all: items.length,
    in_stock: items.filter(
      (item) => getStockStatus(item.availableQuantity) === "in_stock",
    ).length,
    low_stock: items.filter(
      (item) => getStockStatus(item.availableQuantity) === "low_stock",
    ).length,
    out_of_stock: items.filter(
      (item) => getStockStatus(item.availableQuantity) === "out_of_stock",
    ).length,
  } satisfies Record<StockFilter, number>;
}

export function formatStockFilterLabel(value: StockFilter) {
  switch (value) {
    case "all":
      return "All";
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out Of Stock";
  }
}

export function formatStockSummary(count: number, locationName?: string) {
  if (!locationName) {
    return `${formatCount(count)} variant${count === 1 ? "" : "s"} assigned`;
  }

  return `${formatCount(count)} variant${count === 1 ? "" : "s"} at ${locationName}`;
}

export function filterAssignments(input: {
  items: CurrentAssignment[];
  search: string;
  stockFilter: StockFilter;
}) {
  const { items, search, stockFilter } = input;
  const stockFiltered =
    stockFilter === "all"
      ? items
      : items.filter(
          (item) => getStockStatus(item.availableQuantity) === stockFilter,
        );

  const query = search.trim().toLowerCase();
  if (!query) return stockFiltered;

  return stockFiltered.filter(
    (item) =>
      item.productName.toLowerCase().includes(query) ||
      item.variantName.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query),
  );
}
