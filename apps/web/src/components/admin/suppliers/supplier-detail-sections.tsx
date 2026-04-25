"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ReceiptText } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { formatDateTime } from "@/lib/display/format";
import { cn } from "@/lib/utils";
import type { SupplierFormValues } from "./supplier-form";

export function TransactionsPanel({
  transactions,
}: {
  transactions: AdminSupplierDetail["recentTransactions"];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-6 shadow-none">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-foreground">
          Supplier transactions
        </h3>
        <p className="type-support text-muted-foreground">
          Review recent purchase orders, receipts, credits, returns, and payment
          activity recorded against this supplier.
        </p>
      </div>
      {transactions.length === 0 ? (
        <AppEmptyState
          description="Purchase orders, supplier invoices, receipts, returns, credits, and payments will appear here."
          icon={ReceiptText}
          kind="no-data"
          title="No supplier transactions"
        />
      ) : (
        <AppTableWrapper>
          {transactions.map((item, index) => (
            <div
              className={cn(
                "flex flex-col gap-1 p-4",
                index !== transactions.length - 1 &&
                  "border-b border-border/50",
              )}
              key={`${item.reference}-${item.transactionType}`}
            >
              <p className="font-semibold text-foreground">{item.reference}</p>
              <p className="type-support text-muted-foreground">
                <span className="capitalize text-foreground">
                  {item.transactionType.replaceAll("_", " ")}
                </span>
                {" | "}
                {formatDateTime(item.occurredAt, {
                  empty: "Date unavailable",
                })}
              </p>
            </div>
          ))}
        </AppTableWrapper>
      )}
    </div>
  );
}

export function toSupplierFormValues(
  supplier: AdminSupplierDetail,
): SupplierFormValues {
  return {
    email: supplier.email ?? "",
    legalName: supplier.legalName ?? "",
    name: supplier.name,
    notes: "",
    paymentTermsDays: supplier.paymentTermsDays,
    phone: supplier.phone ?? "",
    status: supplier.status,
    taxId: supplier.taxId ?? "",
    website: supplier.website ?? "",
  };
}
