"use client";

import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type AppDataTableSort,
  getAlignmentClass,
  getColumnMeta,
  getNextSortingState,
} from "./app-data-table.support";

export function AppDataTableHead<TData>({
  table,
  headClassName,
  onSortingChange,
  sortingState,
}: {
  table: ReactTable<TData>;
  headClassName: string;
  onSortingChange?: (sorting: AppDataTableSort | null) => void;
  sortingState: Array<{ desc: boolean; id: string }>;
}) {
  return (
    <TableHeader className="bg-muted/50">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="border-b border-border/60 hover:bg-transparent"
        >
          {headerGroup.headers.map((header) => {
            const meta = getColumnMeta(header.column.columnDef.meta);
            const label = header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext());
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
                  "px-6 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground font-heading",
                  headClassName,
                  getAlignmentClass(meta?.align),
                  meta?.className,
                )}
              >
                {header.column.getCanSort() ? (
                  <Button
                    className="h-auto px-0 text-inherit hover:text-foreground hover:bg-transparent transition-colors"
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
                      <ArrowUp
                        aria-hidden="true"
                        className="ml-2 size-3 text-primary"
                      />
                    ) : sortDirection === "desc" ? (
                      <ArrowDown
                        aria-hidden="true"
                        className="ml-2 size-3 text-primary"
                      />
                    ) : (
                      <ArrowUpDown
                        aria-hidden="true"
                        className="ml-2 size-3 opacity-30"
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
  );
}
