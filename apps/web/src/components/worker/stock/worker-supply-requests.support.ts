import type { StockSupplyRequestResponse } from "@shop/contracts";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  type LucideIcon,
  PackageCheck,
  XCircle,
} from "lucide-react";

export type WorkerRequestFilter =
  | "all"
  | "active"
  | "approved"
  | "dispatched"
  | "closed";
export type WorkerViewMode = "card" | "compact";
export type WorkerRequestCounts = Record<WorkerRequestFilter, number>;

export const WORKER_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: WorkerRequestFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Approved", value: "approved" },
  { label: "In transit", value: "dispatched" },
  { label: "History", value: "closed" },
];

export function filterWorkerSupplyRequests(
  items: readonly StockSupplyRequestResponse[],
  statusFilter: WorkerRequestFilter,
  search: string,
) {
  const statusFiltered = filterByStatus(items, statusFilter);
  const query = search.trim().toLowerCase();

  if (!query) return [...statusFiltered];

  return statusFiltered.filter((item) =>
    [
      item.skuSnapshot.productName,
      item.skuSnapshot.variantName,
      item.reference,
      item.gtnReference,
    ].some((value) => value?.toLowerCase().includes(query)),
  );
}

export function getWorkerSupplyRequestCounts(
  items: readonly StockSupplyRequestResponse[],
): WorkerRequestCounts {
  return {
    active: items.filter((item) => isActiveStatus(item.status)).length,
    all: items.length,
    approved: items.filter((item) => item.status === "approved").length,
    closed: items.filter((item) => isClosedStatus(item.status)).length,
    dispatched: items.filter((item) => item.status === "dispatched").length,
  };
}

export function workerStatusMeta(status: string): {
  accent: {
    badge: string;
    bar: string;
    border: string;
    icon: string;
  };
  icon: LucideIcon;
  label: string;
} {
  switch (status) {
    case "approved":
      return { accent: successAccent(), icon: CheckCircle2, label: "Approved" };
    case "dispatched":
      return {
        accent: {
          badge: "bg-primary/10 text-primary",
          bar: "bg-primary",
          border: "border-primary/30",
          icon: "bg-primary/10 text-primary",
        },
        icon: ArrowRight,
        label: "In transit",
      };
    case "received":
      return { accent: successAccent(), icon: PackageCheck, label: "Received" };
    case "rejected":
      return {
        accent: {
          badge: "bg-destructive/10 text-destructive",
          bar: "bg-destructive",
          border: "border-destructive/30 dark:border-destructive/20",
          icon: "bg-destructive/10 text-destructive",
        },
        icon: XCircle,
        label: "Rejected",
      };
    case "cancelled":
      return {
        accent: {
          badge: "bg-muted text-muted-foreground dark:bg-muted/30",
          bar: "bg-muted-foreground/40",
          border: "border-border",
          icon: "bg-muted text-muted-foreground dark:bg-muted/30",
        },
        icon: XCircle,
        label: "Cancelled",
      };
    default:
      return {
        accent: {
          badge: "bg-warning/20 text-warning-foreground",
          bar: "bg-warning",
          border: "border-warning/30",
          icon: "bg-warning/20 text-warning-foreground",
        },
        icon: Clock,
        label: "Pending",
      };
  }
}

function filterByStatus(
  items: readonly StockSupplyRequestResponse[],
  statusFilter: WorkerRequestFilter,
) {
  if (statusFilter === "all") return items;
  if (statusFilter === "active") {
    return items.filter((item) => isActiveStatus(item.status));
  }
  if (statusFilter === "closed") {
    return items.filter((item) => isClosedStatus(item.status));
  }
  return items.filter((item) => item.status === statusFilter);
}

function isActiveStatus(status: string) {
  return (
    status === "pending" || status === "approved" || status === "dispatched"
  );
}

function isClosedStatus(status: string) {
  return (
    status === "received" || status === "rejected" || status === "cancelled"
  );
}

function successAccent() {
  return {
    badge: "bg-success/10 text-success",
    bar: "bg-success",
    border: "border-success/30",
    icon: "bg-success/10 text-success",
  };
}
