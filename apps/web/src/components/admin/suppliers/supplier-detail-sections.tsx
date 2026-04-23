"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ReceiptText } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { cn } from "@/lib/utils";
import type { SupplierFormValues } from "./supplier-form";

export function TransactionsPanel({
  transactions,
}: {
  transactions: AdminSupplierDetail["recentTransactions"];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
        Supplier transactions
      </h3>
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
              <p className="text-xs text-muted-foreground/80">
                <span className="capitalize">
                  {item.transactionType.replaceAll("_", " ")}
                </span>{" "}
                •{" "}
                {new Date(item.occurredAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
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
