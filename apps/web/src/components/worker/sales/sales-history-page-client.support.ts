"use client";

import type { AppDataTableEmptyState } from "@/components/data-table/app-data-table.support";

export const WORKER_SALES_DOCUMENT_TYPES = [
  "adjusted",
  "all",
  "credit_note",
  "invoice",
] as const;

export const WORKER_SALES_TABLE_SKELETON_KEYS = [
  "worker-sales-row-1",
  "worker-sales-row-2",
  "worker-sales-row-3",
  "worker-sales-row-4",
  "worker-sales-row-5",
] as const;

export function getWorkerSalesTableState(hasFilters: boolean): {
  emptyDescription: string;
  emptyState: AppDataTableEmptyState;
  emptyTitle: string;
} {
  return {
    emptyDescription: hasFilters
      ? "Try broadening the current search or filters."
      : "No sales have been recorded at this location yet.",
    emptyState: {
      kind: hasFilters ? "no-results" : "no-data",
      ...(hasFilters
        ? {}
        : {
            description: "No sales have been recorded at this location yet.",
            title: "No sales recorded",
          }),
    },
    emptyTitle: hasFilters ? "No sales match" : "No sales recorded",
  };
}
