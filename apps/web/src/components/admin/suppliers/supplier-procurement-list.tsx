"use client";

import type { AdminSupplierDetail } from "@shop/contracts";
import { ShoppingCart } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatPublicReference } from "@/lib/display/format";
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
            <p className="type-data-value">
              {formatPublicReference(props.order.reference)}
            </p>
            <Badge
              className="rounded-md text-[10px] font-semibold"
              variant="secondary"
            >
              {formatProcurementStatus(props.order.status)}
            </Badge>
          </div>
          <p className="type-support mt-0.5">
            {props.order.destinationLocationName ?? "Direct shipment"} |{" "}
            {formatCount(props.order.lines.length)} line item
            {props.order.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge variant="outline">
          {formatProcurementStatus(props.order.status)}
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
            {formatActionLabel(action)}
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

function formatProcurementStatus(
  status: AdminSupplierDetail["procurementOrders"][number]["status"],
) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "ordered":
      return "Ordered";
    case "partially_received":
      return "Partially received";
    case "received":
      return "Received";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
  }
}

function formatActionLabel(action: ProcurementAction) {
  switch (action) {
    case "approve":
      return "Approve";
    case "cancel":
      return "Cancel";
    case "close":
      return "Close";
    case "order":
      return "Place order";
    case "submit":
      return "Submit";
  }
}
