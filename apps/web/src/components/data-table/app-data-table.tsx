"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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

type AppDataTableColumnMeta = {
  align?: "center" | "left" | "right";
  className?: string;
};

type AppDataTableProps<TData> = {
  caption?: string;
  columns: Array<ColumnDef<TData, unknown>>;
  data: TData[];
  density?: "comfortable" | "compact";
  emptyDescription: string;
  emptyTitle: string;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  toolbar?: ReactNode;
};

function getAlignmentClass(align?: AppDataTableColumnMeta["align"]) {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

export function AppDataTable<TData>({
  caption,
  columns,
  data,
  density = "comfortable",
  emptyDescription,
  emptyTitle,
  getRowId,
  toolbar,
}: AppDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableOptions = {
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
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
          <div className="support-copy text-sm">
            Shared wrapper for TanStack Table with the house empty-state and
            sorting conventions.
          </div>
          <div className="token-row">{toolbar}</div>
        </div>
      ) : null}

      <Table className="rounded-xl border bg-card">
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | AppDataTableColumnMeta
                  | undefined;
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
                        onClick={header.column.getToggleSortingHandler()}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {label}
                        <span className="sr-only">{sortLabel}</span>
                        <span aria-hidden="true">
                          {sortDirection === "asc"
                            ? "↑"
                            : sortDirection === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
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
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | AppDataTableColumnMeta
                    | undefined;

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
                <Empty className="border-border bg-muted/30">
                  <EmptyHeader>
                    <EmptyTitle>{emptyTitle}</EmptyTitle>
                    <EmptyDescription>{emptyDescription}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    Populate this view through React Query and keep row state in
                    TanStack Table rather than ad hoc arrays and booleans.
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
