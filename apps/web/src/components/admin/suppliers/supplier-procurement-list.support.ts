"use client";

import type { AdminSupplierDetail } from "@shop/contracts";

type ProcurementOrder = AdminSupplierDetail["procurementOrders"][number];

export type ProcurementAction =
  | "approve"
  | "cancel"
  | "close"
  | "order"
  | "submit";

export type ProcurementTimelineItem = {
  at: string | null;
  description: string;
  isComplete: boolean;
  isCurrent: boolean;
  label: string;
};

export function nextProcurementActions(status: ProcurementOrder["status"]) {
  if (status === "draft") return ["submit", "cancel"] as const;
  if (status === "submitted") return ["approve", "cancel"] as const;
  if (status === "approved") return ["order", "cancel"] as const;
  if (status === "partially_received" || status === "received") {
    return ["close"] as const;
  }
  return [] as const;
}

export function formatProcurementStatus(status: ProcurementOrder["status"]) {
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
      return "Partially Received";
    case "received":
      return "Received";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
  }
}

export function formatProcurementActionLabel(action: ProcurementAction) {
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

export function buildProcurementTimeline(
  order: ProcurementOrder,
): ProcurementTimelineItem[] {
  const status = order.status;

  return [
    {
      at: order.createdAt,
      description: "Order draft created and ready for internal review.",
      isComplete: true,
      isCurrent: status === "draft",
      label: "Draft Created",
    },
    {
      at: statusReachedAt(order, "submitted"),
      description: "Draft submitted for approval and supplier processing.",
      isComplete: status !== "draft",
      isCurrent: status === "submitted",
      label: "Submitted",
    },
    {
      at: order.approvedAt,
      description: "Commercial and internal checks approved the order.",
      isComplete:
        order.approvedAt != null ||
        status === "ordered" ||
        status === "partially_received" ||
        status === "received" ||
        status === "closed",
      isCurrent: status === "approved",
      label: "Approved",
    },
    {
      at: order.orderedAt,
      description: "Supplier order placed and awaiting delivery progress.",
      isComplete:
        order.orderedAt != null ||
        status === "partially_received" ||
        status === "received" ||
        status === "closed",
      isCurrent: status === "ordered",
      label: "Ordered",
    },
    {
      at: order.receivedAt,
      description:
        status === "partially_received"
          ? "Some ordered quantities have been received."
          : "All expected quantities have been received.",
      isComplete:
        status === "partially_received" ||
        status === "received" ||
        status === "closed",
      isCurrent: status === "partially_received" || status === "received",
      label:
        status === "partially_received" ? "Partially Received" : "Received",
    },
    {
      at: status === "closed" ? order.receivedAt : null,
      description: "Procurement lifecycle completed and closed.",
      isComplete: status === "closed",
      isCurrent: status === "closed",
      label: "Closed",
    },
    {
      at: order.cancelledAt,
      description: "Procurement order cancelled before completion.",
      isComplete: status === "cancelled",
      isCurrent: status === "cancelled",
      label: "Cancelled",
    },
  ].filter((item) => item.label !== "Closed" || status === "closed");
}

function statusReachedAt(
  order: ProcurementOrder,
  target: "submitted",
): string | null {
  if (target === "submitted") {
    return order.approvedAt ?? order.orderedAt ?? order.receivedAt ?? null;
  }

  return null;
}
