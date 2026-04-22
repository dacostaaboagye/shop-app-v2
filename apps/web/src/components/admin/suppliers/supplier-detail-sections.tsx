"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ReceiptText } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupplierFormValues } from "./supplier-form";

export function TransactionsPanel({
  transactions,
}: {
  transactions: AdminSupplierDetail["recentTransactions"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <AppEmptyState
            description="Purchase orders, supplier invoices, receipts, returns, credits, and payments will appear here."
            icon={ReceiptText}
            kind="no-data"
            title="No supplier transactions"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((item) => (
              <div
                className="rounded-md border border-border p-3"
                key={`${item.reference}-${item.transactionType}`}
              >
                <p className="font-medium">{item.reference}</p>
                <p className="text-sm text-muted-foreground">
                  {item.transactionType.replaceAll("_", " ")} on{" "}
                  {new Date(item.occurredAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
