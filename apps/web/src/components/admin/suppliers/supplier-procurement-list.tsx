"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProcurementAction =
  | "approve"
  | "cancel"
  | "close"
  | "order"
  | "submit";

export function SupplierProcurementList(props: {
  onAction: (reference: string, action: ProcurementAction) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  orders: AdminSupplierDetail["procurementOrders"];
}) {
  if (props.orders.length === 0) {
    return (
      <AppEmptyState
        description="Supplier purchase orders, approvals, dispatch, receipts, and closure will appear here."
        icon={ShoppingCart}
        kind="no-data"
        title="No procurement orders"
      />
    );
  }

  return (
    <AppTableWrapper>
      {props.orders.map((order, index) => (
        <OrderRow
          index={index}
          itemCount={props.orders.length}
          key={order.reference}
          onAction={props.onAction}
          onReceive={props.onReceive}
          order={order}
        />
      ))}
    </AppTableWrapper>
  );
}

function OrderRow(props: {
  index: number;
  itemCount: number;
  onAction: (reference: string, action: ProcurementAction) => void;
  onReceive: (
    reference: string,
    lines: Array<{ receivedQuantity: number; variantSlug: string }>,
  ) => void;
  order: AdminSupplierDetail["procurementOrders"][number];
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4",
        props.index !== props.itemCount - 1 && "border-b border-border/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {props.order.reference}
            </p>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              {props.order.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {props.order.destinationLocationName ?? "Direct shipment"} •{" "}
            {props.order.lines.length} line item
            {props.order.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge variant="outline">
          {props.order.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {nextActions(props.order.status).map((action) => (
          <Button
            key={action}
            onClick={() => props.onAction(props.order.reference, action)}
            size="sm"
            type="button"
            variant="outline"
          >
            {action}
          </Button>
        ))}
        {props.order.status === "ordered" ||
        props.order.status === "partially_received" ? (
          <Button
            onClick={() =>
              props.onReceive(
                props.order.reference,
                props.order.lines.map((line) => ({
                  receivedQuantity:
                    line.approvedQuantity ?? line.requestedQuantity,
                  variantSlug: line.variantSlug,
                })),
              )
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Receive all
          </Button>
        ) : null}
      </div>
    </div>
  );
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
