"use client";

import { CatalogListFilterPanel } from "../catalog-list-filter-panel";

export function CategoryFilters({
  draftSearch,
  onDraftSearchChange,
  onStatusChange,
  onClear,
  status,
  totalCount,
  hasFilters,
}: {
  draftSearch: string;
  onDraftSearchChange: (value: string) => void;
  onStatusChange: (value: string | null) => void;
  onClear: () => void;
  status: string;
  totalCount: number;
  hasFilters: boolean;
}) {
  return (
    <CatalogListFilterPanel
      activeSearch={draftSearch}
      draftSearch={draftSearch}
      entityLabelPlural="categories"
      hasFilters={hasFilters}
      onClear={onClear}
      onDraftSearchChange={onDraftSearchChange}
      onStatusChange={onStatusChange}
      status={status}
      totalCount={totalCount}
    />
  );
}
