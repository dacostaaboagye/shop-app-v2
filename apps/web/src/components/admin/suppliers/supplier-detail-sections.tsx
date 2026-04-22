"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ReceiptText, ShoppingCart } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupplierFormValues } from "./supplier-form";

type ProcurementAction = "approve" | "cancel" | "close" | "order" | "submit";

export function ProcurementPanel(props: {
  onAction: (reference: string, action: ProcurementAction) => void;
  orders: AdminSupplierDetail["procurementOrders"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supply lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {props.orders.length === 0 ? (
          <AppEmptyState
            description="Supplier purchase orders, approvals, dispatch, receipts, and closure will appear here."
            icon={ShoppingCart}
            kind="no-data"
            title="No procurement orders"
          />
        ) : (
          props.orders.map((order) => (
            <div
              className="rounded-md border border-border p-3"
              key={order.reference}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{order.reference}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.destinationLocationName ?? "No destination"} -{" "}
                    {order.lines.length} line(s)
                  </p>
                </div>
                <Badge variant="outline">
                  {order.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {nextActions(order.status).map((action) => (
                  <Button
                    key={action}
                    onClick={() => props.onAction(order.reference, action)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

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

function nextActions(
  status: AdminSupplierDetail["procurementOrders"][number]["status"],
) {
  if (status === "draft") return ["submit", "cancel"] as const;
  if (status === "submitted") return ["approve", "cancel"] as const;
  if (status === "approved") return ["order", "cancel"] as const;
  if (status === "partially_received" || status === "received") {
    return ["close"] as const;
  }
  return [] as const;
}
