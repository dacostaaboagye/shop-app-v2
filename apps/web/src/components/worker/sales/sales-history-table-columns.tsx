"use client";

import type { InvoiceListResponse } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPublicReference } from "@/lib/display/format";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";

type SalesHistoryRow = InvoiceListResponse["items"][number];

export function buildSalesHistoryTableColumns(
  moneyProfile: MoneyProfile,
): Array<ColumnDef<SalesHistoryRow, unknown>> {
  return [
    {
      id: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="type-data-value text-sm">
            {formatPublicReference(row.original.reference)}
          </span>
          <span className="type-support text-xs">
            {formatDateTime(row.original.createdAt)}
          </span>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <span className="type-support">
          {row.original.customerName ?? "Walk-in customer"}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Badge
            className="rounded-lg border-none px-2 py-0.5 text-[10px] font-bold shadow-sm"
            variant={getSalesBadgeVariant(row.original)}
          >
            {getSalesBadgeLabel(row.original)}
          </Badge>
          <Badge
            className="rounded-lg px-2 py-0.5 text-[10px]"
            variant="outline"
          >
            {formatClassification(row.original.classification)}
          </Badge>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className="rounded-lg px-2 py-0.5 text-[10px]" variant="outline">
          {formatDocumentStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => (
        <span className="type-support">
          {formatPaymentMethod(row.original)}
        </span>
      ),
    },
    {
      id: "totalAmount",
      header: "Total",
      meta: { align: "right" as const },
      cell: ({ row }) => (
        <span className="type-data-value text-sm tabular-nums">
          {formatMoney(row.original.totalAmount, moneyProfile)}
        </span>
      ),
    },
  ];
}

function getSalesBadgeLabel(invoice: SalesHistoryRow) {
  if (invoice.type === "credit_note") return "Credit Note";
  if (invoice.type === "adjusted") return "Adjusted";
  return "Sale";
}

function getSalesBadgeVariant(invoice: SalesHistoryRow) {
  if (invoice.type === "credit_note") return "destructive" as const;
  if (invoice.type === "adjusted") return "outline" as const;
  return "secondary" as const;
}

function formatDocumentStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function formatPaymentMethod(invoice: SalesHistoryRow) {
  if (invoice.paymentMethod === "mobile_money") {
    return "Mobile money";
  }

  return invoice.paymentMethod
    ? invoice.paymentMethod.charAt(0).toUpperCase() +
        invoice.paymentMethod.slice(1)
    : "Other";
}

function formatClassification(value: "internal" | "outgoing") {
  return value === "internal" ? "Internal" : "Outgoing";
}
