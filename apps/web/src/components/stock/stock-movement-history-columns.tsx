"use client";

import type { StockMovementSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatMovementLabel } from "./stock-movement-history.support";

export const stockMovementHistoryColumns: ColumnDef<StockMovementSummary>[] = [
  {
    id: "product",
    enableSorting: false,
    header: "Product / Variant",
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold text-foreground">
          {row.original.productName}
        </p>
        <p className="type-support text-muted-foreground">
          {row.original.variantName}
        </p>
      </div>
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
    accessorKey: "locationName",
    enableSorting: false,
    header: "Location",
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: "quantityDelta",
    header: "Delta",
    meta: { align: "right" },
    cell: ({ getValue }) => {
      const value = getValue() as number;
      const tone =
        value > 0
          ? "border-success/40 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive";
      return (
        <Badge className={tone} variant="outline">
          {value > 0 ? `+${value}` : value}
        </Badge>
      );
    },
  },
  {
    accessorKey: "movementType",
    enableSorting: false,
    header: "Movement",
    cell: ({ getValue }) => (
      <Badge
        className="rounded-md text-[10px] font-semibold"
        variant="secondary"
      >
        {formatMovementLabel(getValue() as string)}
      </Badge>
    ),
  },
  {
    id: "source",
    enableSorting: false,
    header: "Source",
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="type-support text-muted-foreground">
          {formatMovementLabel(row.original.sourceType)}
        </span>
        <span className="type-identifier break-all text-foreground">
          {row.original.sourceReference ?? "Reference hidden"}
        </span>
      </div>
    ),
  },
  {
    id: "context",
    enableSorting: false,
    header: "Reason / Actor",
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="type-support text-muted-foreground">
          {row.original.reasonCode
            ? formatMovementLabel(row.original.reasonCode)
            : "Operational movement"}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.original.actorName ?? "System"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "occurredAt",
    header: "Occurred",
    cell: ({ getValue }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {formatMovementDate(getValue() as string)}
      </span>
    ),
  },
];

function formatMovementDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
