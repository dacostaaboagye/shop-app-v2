import type { StockSupplyRequestResponse } from "@shop/contracts";
import { getSupplyRequestStatusPresentation } from "@/components/stock/stock-status";

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

export function workerStatusMeta(
  status: StockSupplyRequestResponse["status"],
): {
  accent: ReturnType<typeof getSupplyRequestStatusPresentation>["accent"];
  icon: ReturnType<typeof getSupplyRequestStatusPresentation>["icon"];
  label: string;
} {
  return getSupplyRequestStatusPresentation(status);
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
