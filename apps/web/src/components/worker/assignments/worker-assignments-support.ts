import type { CurrentAssignment } from "@shop/contracts";

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
