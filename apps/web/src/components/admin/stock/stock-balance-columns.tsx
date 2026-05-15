import type { AdminStockBalanceSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function buildStockBalanceColumns(
  onCount: ((row: AdminStockBalanceSummary) => void) | null,
  onWriteOff: ((row: AdminStockBalanceSummary) => void) | null = null,
): ColumnDef<AdminStockBalanceSummary>[] {
  const base: ColumnDef<AdminStockBalanceSummary>[] = [
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
          <StockRowActions
            onCount={onCount}
            onWriteOff={onWriteOff}
            row={row.original}
          />
        </div>
      ),
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
      accessorKey: "onHandQuantity",
      header: "On hand",
      meta: { align: "right" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "reservedQuantity",
      header: "Reserved",
      meta: { align: "right" },
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground">
          {getValue() as number}
        </span>
      ),
    },
    {
      accessorKey: "inTransitQuantity",
      header: "In transit",
      meta: { align: "right" },
      cell: ({ getValue }) => {
        const qty = getValue() as number;
        return (
          <span className="tabular-nums text-muted-foreground">
            {qty > 0 ? qty : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "availableQuantity",
      header: "Available",
      meta: { align: "right" },
      cell: ({ getValue }) => {
        const qty = getValue() as number;
        return (
          <Badge
            className={
              qty === 0
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : qty <= 5
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-success/40 bg-success/10 text-success"
            }
            variant="outline"
          >
            {qty}
          </Badge>
        );
      },
    },
  ];

  return base;
}

function StockRowActions({
  onCount,
  onWriteOff,
  row,
}: {
  onCount: ((row: AdminStockBalanceSummary) => void) | null;
  onWriteOff: ((row: AdminStockBalanceSummary) => void) | null;
  row: AdminStockBalanceSummary;
}) {
  if (!onCount && !onWriteOff) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {onCount ? (
        <Button
          onClick={() => onCount(row)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ClipboardList className="size-3.5" />
          Count
        </Button>
      ) : null}
      {onWriteOff ? (
        <Button
          disabled={row.availableQuantity <= 0}
          onClick={() => onWriteOff(row)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-3.5" />
          Write off
        </Button>
      ) : null}
    </div>
  );
}
