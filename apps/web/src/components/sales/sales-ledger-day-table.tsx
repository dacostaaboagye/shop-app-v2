"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoneyProfile } from "@/lib/money/format-money";
import { formatMoney } from "@/lib/money/format-money";
import type { SalesLedgerDay } from "./sales-ledger-support";

export function SalesLedgerDayTable({
  days,
  moneyProfile,
}: {
  days: SalesLedgerDay[];
  moneyProfile: MoneyProfile;
}) {
  const columns = useMemo<Array<ColumnDef<SalesLedgerDay>>>(
    () => [
      {
        accessorKey: "displayDate",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="type-data-value text-sm">
              {row.original.displayDate}
            </span>
            <span className="type-support text-xs">{row.original.dateKey}</span>
          </div>
        ),
        header: "Day",
      },
      {
        accessorKey: "receiptCount",
        header: "Receipts",
        meta: { align: "right" },
      },
      {
        accessorKey: "creditNoteCount",
        header: "Credits",
        meta: { align: "right" },
      },
      {
        accessorKey: "grossSalesAmount",
        cell: ({ row }) =>
          formatMoney(row.original.grossSalesAmount, moneyProfile),
        header: "Sales",
        meta: { align: "right" },
      },
      {
        accessorKey: "creditNoteAmount",
        cell: ({ row }) =>
          formatMoney(row.original.creditNoteAmount, moneyProfile),
        header: "Returns",
        meta: { align: "right" },
      },
      {
        accessorKey: "netRevenueAmount",
        cell: ({ row }) =>
          formatMoney(row.original.netRevenueAmount, moneyProfile),
        header: "Net",
        meta: { align: "right" },
      },
      {
        accessorKey: "averageReceiptAmount",
        cell: ({ row }) =>
          formatMoney(row.original.averageReceiptAmount, moneyProfile),
        header: "Avg receipt",
        meta: { align: "right" },
      },
    ],
    [moneyProfile],
  );

  return (
    <Card className="rounded-xl border border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50">
        <CardTitle>Daily ledger</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <AppDataTable
          columns={columns}
          data={[...days].reverse()}
          density="compact"
          emptyDescription="Adjust the filters to reveal daily performance."
          emptyTitle="No ledger rows"
        />
      </CardContent>
    </Card>
  );
}
