"use client";

import {
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableCaption } from "@/components/ui/table";
import type { AppDataTableProps } from "./app-data-table.support";
import { AppDataTableBody } from "./app-data-table-body";
import { AppDataTableHead } from "./app-data-table-head";
import { createSelectionColumn } from "./app-data-table-selection-column";

export type { AppDataTableSort } from "./app-data-table.support";

export function AppDataTable<TData>({
  bulkActions,
  caption,
  columns,
  data,
  density = "comfortable",
  emptyDescription,
  emptyState,
  emptyTitle,
  getRowId,
  noContainer = false,
  onRowClick,
  onSortingChange,
  pagination,
  sorting,
  toolbar,
}: AppDataTableProps<TData> & { noContainer?: boolean }) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const controlledSortingState = sorting
    ? [{ desc: sorting.direction === "desc", id: sorting.columnId }]
    : [];
  const sortingState = onSortingChange
    ? controlledSortingState
    : internalSorting;
  const selectionEnabled = !!bulkActions;
  const visibleColumns = selectionEnabled
    ? [
        createSelectionColumn<TData>({
          selectionAriaLabel: bulkActions?.selectionAriaLabel,
        }),
        ...columns,
      ]
    : columns;

  const tableOptions = {
    columns: visibleColumns,
    data,
    enableRowSelection: selectionEnabled,
    getCoreRowModel: getCoreRowModel(),
    ...(onSortingChange
      ? { manualSorting: true }
      : {
          getSortedRowModel: getSortedRowModel(),
          onSortingChange: setInternalSorting,
        }),
    ...(selectionEnabled ? { onRowSelectionChange: setRowSelection } : {}),
    state: {
      ...(selectionEnabled ? { rowSelection } : {}),
      sorting: sortingState,
    },
  };

  const table = useReactTable({
    ...tableOptions,
    ...(getRowId ? { getRowId } : {}),
  });

  const compact = density === "compact";
  const headClassName = compact ? "h-9" : "h-11";
  const cellClassName = compact ? "py-2" : "py-3";
  const visibleColumnCount = table.getVisibleLeafColumns().length || 1;
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const tableContent = (
    <div className="flex flex-col">
      {selectedRows.length > 0 && bulkActions ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/50 px-6 py-3">
          <Badge
            className="rounded-lg bg-foreground text-background border-0"
            variant="secondary"
          >
            {selectedRows.length} selected
          </Badge>
          {bulkActions.render({
            clearSelection: () => setRowSelection({}),
            selectedCount: selectedRows.length,
            selectedRows,
          })}
        </div>
      ) : null}

      {toolbar ? (
        <div className="px-6 py-4 border-b border-border/50">
          <div className="token-row">{toolbar}</div>
        </div>
      ) : null}

      <div className="relative overflow-x-auto">
        <Table className="border-0 bg-transparent">
          {caption ? (
            <TableCaption className="pb-4">{caption}</TableCaption>
          ) : null}
          <AppDataTableHead
            {...(onSortingChange ? { onSortingChange } : {})}
            headClassName={headClassName}
            sortingState={sortingState}
            table={table}
          />
          <AppDataTableBody
            {...(emptyState ? { emptyState } : {})}
            {...(onRowClick ? { onRowClick } : {})}
            cellClassName={cellClassName}
            emptyDescription={emptyDescription}
            emptyTitle={emptyTitle}
            table={table}
            visibleColumnCount={visibleColumnCount}
          />
        </Table>
      </div>

      {pagination ? (
        <div className="border-t border-border/50 bg-white/50 px-6 py-4">
          <AppPagination {...pagination} />
        </div>
      ) : null}
    </div>
  );

  if (noContainer) {
    return tableContent;
  }

  return (
    <div className="rounded-xl border border-border/50 bg-white shadow-sm">
      {tableContent}
    </div>
  );
}
