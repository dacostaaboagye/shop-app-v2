import type { AdminStockBalanceSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function buildStockBalanceColumns(
  onCount: ((row: AdminStockBalanceSummary) => void) | null,
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

  if (!onCount) return base;

  return [
    ...base,
    {
      id: "actions",
      header: "",
      meta: { align: "right" },
      cell: ({ row }) => (
        <Button
          onClick={() => onCount(row.original)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ClipboardList className="size-3.5" />
          Count
        </Button>
      ),
    },
  ];
}
