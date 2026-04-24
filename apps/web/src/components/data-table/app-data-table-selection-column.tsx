"use client";

import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { getBulkSelectionAriaLabel } from "./app-data-table.support";
import { AppDataTableSelectionCheckbox } from "./app-data-table-selection-checkbox";

export function createSelectionColumn<TData>(input: {
  selectionAriaLabel?: string | undefined;
}): ColumnDef<TData, unknown> {
  return {
    cell: ({ row }: { row: Row<TData> }) => (
      <AppDataTableSelectionCheckbox
        ariaLabel={getBulkSelectionAriaLabel(input.selectionAriaLabel, "row")}
        checked={row.getIsSelected()}
        indeterminate={row.getIsSomeSelected()}
        onChange={(checked) => row.toggleSelected(checked)}
      />
    ),
    enableSorting: false,
    header: ({ table }: { table: Table<TData> }) => (
      <AppDataTableSelectionCheckbox
        ariaLabel={getBulkSelectionAriaLabel(input.selectionAriaLabel, "all")}
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      />
    ),
    id: "__select",
    meta: { align: "center", className: "w-12" },
  };
}
