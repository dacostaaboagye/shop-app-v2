import type { CurrentAssignment } from "@shop/contracts";
import type { PosSaleFilterOption } from "./pos-sale-assignment-filters";

export type PosSaleAssignmentFiltersState = {
  brandSlug: string;
  categorySlug: string;
  search: string;
};

export function filterSaleAssignments(
  assignments: readonly CurrentAssignment[],
  filters: PosSaleAssignmentFiltersState,
): CurrentAssignment[] {
  const query = filters.search.trim().toLowerCase();

  return assignments.filter((assignment) => {
    const matchesSearch =
      !query ||
      assignment.productName.toLowerCase().includes(query) ||
      assignment.variantName.toLowerCase().includes(query) ||
      assignment.sku.toLowerCase().includes(query);
    const matchesBrand =
      !filters.brandSlug || assignment.brandSlug === filters.brandSlug;
    const matchesCategory =
      !filters.categorySlug || assignment.categorySlug === filters.categorySlug;

    return matchesSearch && matchesBrand && matchesCategory;
  });
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
