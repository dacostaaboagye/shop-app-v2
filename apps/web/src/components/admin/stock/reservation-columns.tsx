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
        <p className="text-sm font-bold text-foreground truncate max-w-[240px]">
          {row.original.productName}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
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
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
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
        className="rounded-md font-bold uppercase tracking-wider text-[10px]"
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
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
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
        <span className="tabular-nums text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
          {new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20">
          -
        </span>
      );
    },
  },
];
