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
      <div className="flex flex-col gap-0.5">
        <p className="text-balance text-sm font-bold text-foreground">
          {row.original.productName}
        </p>
        <p className="type-support text-muted-foreground">
          {row.original.variantName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "locationName",
    enableSorting: false,
    header: "Location",
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-muted-foreground/80">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "sku",
    enableSorting: false,
    header: "SKU",
    cell: ({ getValue }) => (
      <span className="type-identifier break-all text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Reserved",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm font-bold text-foreground">
        {getValue() as number}
      </span>
    ),
  },
  {
    accessorKey: "sourceType",
    enableSorting: false,
    header: "Source",
    cell: ({ getValue }) => (
      <Badge
        className="rounded-md text-[10px] font-semibold"
        variant="secondary"
      >
        {(getValue() as string).replaceAll("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "sourceKey",
    enableSorting: false,
    header: "Source key",
    cell: ({ getValue }) => (
      <span className="type-identifier break-all text-muted-foreground">
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
        <span className="type-support tabular-nums text-muted-foreground">
          {new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : (
        <span className="type-support text-muted-foreground">Not set</span>
      );
    },
  },
];
