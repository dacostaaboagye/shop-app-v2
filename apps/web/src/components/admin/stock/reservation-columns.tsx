"use client";

import type { AdminReservationSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export const reservationColumns: ColumnDef<AdminReservationSummary>[] = [
  {
    id: "product",
    enableSorting: false,
    header: "Product / Variant",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium leading-none">{row.original.productName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.original.variantName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "locationName",
    enableSorting: false,
    header: "Location",
  },
  {
    accessorKey: "sku",
    enableSorting: false,
    header: "SKU",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Reserved",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: "sourceType",
    enableSorting: false,
    header: "Source",
    cell: ({ getValue }) => (
      <Badge variant="outline">{getValue() as string}</Badge>
    ),
  },
  {
    accessorKey: "sourceKey",
    enableSorting: false,
    header: "Source key",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "expiresAt",
    enableSorting: false,
    header: "Expires",
    cell: ({ getValue }) => {
      const value = getValue() as string | null;
      return value ? (
        <span className="tabular-nums text-sm">
          {new Date(value).toLocaleString()}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
];
