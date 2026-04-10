import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { AppPaginationProps } from "@/components/data-table/app-pagination";

type AppDataTableColumnMeta = {
  align?: "center" | "left" | "right";
  className?: string;
};

export type AppDataTableSort = {
  columnId: string;
  direction: "asc" | "desc";
};

export type AppDataTableEmptyState = {
  action?: ReactNode;
  description?: string;
  kind?: "no-data" | "no-results";
  title?: string;
};

export type AppDataTableProps<TData> = {
  caption?: string;
  columns: Array<ColumnDef<TData, unknown>>;
  data: TData[];
  density?: "comfortable" | "compact";
  emptyDescription: string;
  emptyState?: AppDataTableEmptyState;
  emptyTitle: string;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  onRowClick?: (row: TData) => void;
  onSortingChange?: (sorting: AppDataTableSort | null) => void;
  pagination?: AppPaginationProps;
  sorting?: AppDataTableSort | null;
  toolbar?: ReactNode;
};

export function getAlignmentClass(align?: AppDataTableColumnMeta["align"]) {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

export function getColumnMeta(
  meta: unknown,
): AppDataTableColumnMeta | undefined {
  return meta as AppDataTableColumnMeta | undefined;
}

export function getNextSortingState(
  columnId: string,
  sortingState: SortingState,
): AppDataTableSort | null {
  const currentSort = sortingState[0];

  if (!currentSort || currentSort.id !== columnId) {
    return { columnId, direction: "asc" };
  }

  if (currentSort.desc) {
    return null;
  }

  return { columnId, direction: "desc" };
}
