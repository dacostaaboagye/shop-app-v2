import type { CurrentAssignment } from "@shop/contracts";
import type { PosSaleFilterOption } from "./pos-sale-assignment-filters";

export const POS_SALE_QUICK_FILTERS = [
  "all",
  "available",
  "low_stock",
  "in_cart",
] as const;

export const POS_SALE_SORT_OPTIONS = [
  "name",
  "price_asc",
  "price_desc",
  "stock_asc",
  "stock_desc",
] as const;

export const POS_SALE_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

export type PosSaleQuickFilter = (typeof POS_SALE_QUICK_FILTERS)[number];
export type PosSaleSortOption = (typeof POS_SALE_SORT_OPTIONS)[number];

export type PosSaleAssignmentFiltersState = {
  brandSlug: string;
  categorySlug: string;
  quickFilter: PosSaleQuickFilter;
  search: string;
  sort: PosSaleSortOption;
};

export type PosSaleAssignmentSummary = {
  availableCount: number;
  inCartCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCount: number;
};

export function filterSaleAssignments(
  assignments: readonly CurrentAssignment[],
  filters: PosSaleAssignmentFiltersState,
  cartSkuIds: readonly string[] = [],
): CurrentAssignment[] {
  const query = filters.search.trim().toLowerCase();
  const cartSkuIdSet = new Set(cartSkuIds);

  return assignments
    .filter((assignment) => {
      const matchesSearch =
        !query ||
        assignment.productName.toLowerCase().includes(query) ||
        assignment.variantName.toLowerCase().includes(query) ||
        assignment.sku.toLowerCase().includes(query);
      const matchesBrand =
        !filters.brandSlug || assignment.brandSlug === filters.brandSlug;
      const matchesCategory =
        !filters.categorySlug ||
        assignment.categorySlug === filters.categorySlug;
      const matchesQuickFilter = matchesPosSaleQuickFilter(
        assignment,
        filters.quickFilter,
        cartSkuIdSet,
      );

      return (
        matchesSearch && matchesBrand && matchesCategory && matchesQuickFilter
      );
    })
    .sort((left, right) =>
      compareSaleAssignments(left, right, filters.sort, query),
    );
}

export function getSaleAssignmentFilterOptions(
  assignments: readonly CurrentAssignment[],
  valueKey: "brandSlug" | "categorySlug",
  labelKey: "brandName" | "categoryName",
): PosSaleFilterOption[] {
  const options = new Map<string, string>();

  for (const assignment of assignments) {
    const value = assignment[valueKey];
    if (!value) continue;
    options.set(value, assignment[labelKey] ?? value);
  }

  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (left, right) => left.label.localeCompare(right.label),
  );
}

export function paginateSaleAssignments(
  assignments: readonly CurrentAssignment[],
  page: number,
  pageSize: number,
) {
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * pageSize;

  return assignments.slice(startIndex, startIndex + pageSize);
}

export function summarizeSaleAssignments(
  assignments: readonly CurrentAssignment[],
  cartSkuIds: readonly string[] = [],
): PosSaleAssignmentSummary {
  const cartSkuIdSet = new Set(cartSkuIds);

  return assignments.reduce<PosSaleAssignmentSummary>(
    (summary, assignment) => {
      summary.totalCount += 1;

      if (assignment.availableQuantity > 0) {
        summary.availableCount += 1;
      } else {
        summary.outOfStockCount += 1;
      }

      if (
        assignment.availableQuantity > 0 &&
        assignment.availableQuantity <= 3
      ) {
        summary.lowStockCount += 1;
      }

      if (cartSkuIdSet.has(assignment.skuId)) {
        summary.inCartCount += 1;
      }

      return summary;
    },
    {
      availableCount: 0,
      inCartCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalCount: 0,
    },
  );
}

export function getFirstAddableSaleAssignment(
  assignments: readonly CurrentAssignment[],
) {
  return (
    assignments.find((assignment) => assignment.availableQuantity > 0) ?? null
  );
}

export function isLikelySkuSearch(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 3 || normalizedQuery.includes(" ")) {
    return false;
  }

  const hasSkuLikePattern =
    normalizedQuery.includes("-") ||
    /\d/.test(normalizedQuery) ||
    normalizedQuery.includes("/");

  return hasSkuLikePattern && /^[a-z0-9/-]+$/.test(normalizedQuery);
}

export function getSaleAssignmentSearchMatchState(
  assignments: readonly CurrentAssignment[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  const exactSkuMatch =
    assignments.find(
      (assignment) => assignment.sku.toLowerCase() === normalizedQuery,
    ) ?? null;

  if (exactSkuMatch) {
    return { assignment: exactSkuMatch, kind: "exact_sku" as const };
  }

  const prefixSkuMatch =
    assignments.find((assignment) =>
      assignment.sku.toLowerCase().startsWith(normalizedQuery),
    ) ?? null;

  if (prefixSkuMatch) {
    return { assignment: prefixSkuMatch, kind: "prefix_sku" as const };
  }

  return null;
}

function matchesPosSaleQuickFilter(
  assignment: CurrentAssignment,
  quickFilter: PosSaleQuickFilter,
  cartSkuIds: ReadonlySet<string>,
) {
  switch (quickFilter) {
    case "available":
      return assignment.availableQuantity > 0;
    case "low_stock":
      return (
        assignment.availableQuantity > 0 && assignment.availableQuantity <= 3
      );
    case "in_cart":
      return cartSkuIds.has(assignment.skuId);
    default:
      return true;
  }
}

function compareSaleAssignments(
  left: CurrentAssignment,
  right: CurrentAssignment,
  sort: PosSaleSortOption,
  query: string,
) {
  const searchRankDifference =
    getSaleAssignmentSearchRank(left, query) -
    getSaleAssignmentSearchRank(right, query);

  if (searchRankDifference !== 0) {
    return searchRankDifference;
  }

  switch (sort) {
    case "price_asc":
      return compareNumberStrings(left.sellingPrice, right.sellingPrice);
    case "price_desc":
      return compareNumberStrings(right.sellingPrice, left.sellingPrice);
    case "stock_asc":
      return (
        left.availableQuantity - right.availableQuantity ||
        left.productName.localeCompare(right.productName)
      );
    case "stock_desc":
      return (
        right.availableQuantity - left.availableQuantity ||
        left.productName.localeCompare(right.productName)
      );
    default:
      return left.productName.localeCompare(right.productName);
  }
}

function compareNumberStrings(left: string, right: string) {
  return Number.parseFloat(left) - Number.parseFloat(right);
}

function getSaleAssignmentSearchRank(
  assignment: CurrentAssignment,
  query: string,
) {
  if (!query) {
    return 4;
  }

  const sku = assignment.sku.toLowerCase();
  const productName = assignment.productName.toLowerCase();
  const variantName = assignment.variantName.toLowerCase();

  if (sku === query) {
    return 0;
  }

  if (sku.startsWith(query)) {
    return 1;
  }

  if (productName.includes(query) || variantName.includes(query)) {
    return 2;
  }

  if (sku.includes(query)) {
    return 3;
  }

  return 4;
}
