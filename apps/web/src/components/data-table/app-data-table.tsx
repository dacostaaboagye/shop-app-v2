"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { AppPagination } from "@/components/data-table/app-pagination";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type AppDataTableProps,
  getAlignmentClass,
  getColumnMeta,
  getNextSortingState,
} from "./app-data-table.support";

export type { AppDataTableSort } from "./app-data-table.support";

export function AppDataTable<TData>({
  caption,
  columns,
  data,
  density = "comfortable",
  emptyDescription,
  emptyState,
  emptyTitle,
  getRowId,
  onRowClick,
  onSortingChange,
  pagination,
  sorting,
  toolbar,
}: AppDataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const controlledSortingState = sorting
    ? [{ desc: sorting.direction === "desc", id: sorting.columnId }]
    : [];
  const sortingState = onSortingChange
    ? controlledSortingState
    : internalSorting;

  const tableOptions = {
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    ...(onSortingChange
      ? { manualSorting: true }
      : {
          getSortedRowModel: getSortedRowModel(),
          onSortingChange: setInternalSorting,
        }),
    state: {
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

  return (
    <div className="flex flex-col gap-4">
      {toolbar ? (
        <div className="split-callout">
          <div />
          <div className="token-row">{toolbar}</div>
        </div>
      ) : null}

      <Table className="rounded-lg border bg-card">
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = getColumnMeta(header.column.columnDef.meta);
                const label = header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    );
                const sortDirection = header.column.getIsSorted();
                const sortLabel =
                  sortDirection === "asc"
                    ? "Ascending"
                    : sortDirection === "desc"
                      ? "Descending"
                      : "Sort";

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      headClassName,
                      getAlignmentClass(meta?.align),
                      meta?.className,
                    )}
                  >
                    {header.column.getCanSort() ? (
                      <Button
                        className="h-auto px-0 text-inherit"
                        onClick={
                          onSortingChange
                            ? () =>
                                onSortingChange(
                                  getNextSortingState(
                                    header.column.id,
                                    sortingState,
                                  ),
                                )
                            : header.column.getToggleSortingHandler()
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {label}
                        <span className="sr-only">{sortLabel}</span>
                        {sortDirection === "asc" ? (
                          <ArrowUp aria-hidden="true" className="size-3.5" />
                        ) : sortDirection === "desc" ? (
                          <ArrowDown aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ArrowUpDown
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        )}
                      </Button>
                    ) : (
                      label
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement;
                        const isInteractive = !!target.closest(
                          'button, a, input, select, textarea, [role="menuitem"], [data-no-row-click="true"]',
                        );
                        if (!isInteractive) {
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = getColumnMeta(cell.column.columnDef.meta);

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cellClassName,
                        getAlignmentClass(meta?.align),
                        meta?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="py-8" colSpan={visibleColumnCount}>
                <AppEmptyState
                  action={emptyState?.action}
                  description={emptyState?.description ?? emptyDescription}
                  title={emptyState?.title ?? emptyTitle}
                  {...(emptyState?.kind ? { kind: emptyState.kind } : {})}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pagination ? <AppPagination {...pagination} /> : null}
    </div>
  );
}
