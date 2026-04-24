"use client";

import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type AppDataTableEmptyState,
  getAlignmentClass,
  getColumnMeta,
} from "./app-data-table.support";

export function AppDataTableBody<TData>({
  table,
  cellClassName,
  onRowClick,
  emptyState,
  emptyDescription,
  emptyTitle,
  visibleColumnCount,
}: {
  table: ReactTable<TData>;
  cellClassName: string;
  onRowClick?: (row: TData) => void;
  emptyState?: AppDataTableEmptyState;
  emptyDescription?: string;
  emptyTitle?: string;
  visibleColumnCount: number;
}) {
  return (
    <TableBody>
      {table.getRowModel().rows.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(
              "border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors",
              onRowClick ? "cursor-pointer" : undefined,
            )}
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
                    "px-6 font-normal text-foreground",
                    cellClassName,
                    getAlignmentClass(meta?.align),
                    meta?.className,
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell className="py-16" colSpan={visibleColumnCount}>
            <AppEmptyState
              action={emptyState?.action}
              description={
                emptyState?.description ??
                emptyDescription ??
                "No records found."
              }
              title={emptyState?.title ?? emptyTitle ?? "No data"}
              {...(emptyState?.kind ? { kind: emptyState.kind } : {})}
            />
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}
