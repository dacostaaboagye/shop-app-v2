import type { ManagerHandoverLane, WorkerHandoverLane } from "@shop/contracts";
import type { ManagerHandoverRow } from "./postgres-manager-handover-query.repository.js";
import type { WorkerHandoverRow } from "./postgres-worker-handover-query.repository.js";

type HandoverResponseRow = Omit<WorkerHandoverRow, "lane"> & {
  lane: string;
};

export function toHandoverSummaryResponse(handover: HandoverResponseRow) {
  return {
    canRevert: handover.canRevert,
    currentWorkerName: handover.currentWorkerName,
    currentWorkerSlug: handover.currentWorkerSlug,
    fromWorkerName: handover.fromWorkerName,
    fromWorkerSlug: handover.fromWorkerSlug,
    handoverChainId: handover.handoverChainId,
    lane: handover.lane,
    latestEventType: handover.latestEventType,
    locationId: handover.locationId,
    locationName: handover.locationName,
    primaryImageUrl: handover.primaryImageUrl,
    productName: handover.productName,
    productSlug: handover.productSlug,
    quantity: handover.quantity,
    sku: handover.sku,
    skuId: handover.skuId,
    startedAt: handover.startedAt.toISOString(),
    toWorkerName: handover.toWorkerName,
    toWorkerSlug: handover.toWorkerSlug,
    updatedAt: handover.updatedAt.toISOString(),
    variantName: handover.variantName,
    variantSlug: handover.variantSlug,
  };
}

export function getWorkerHandoverLaneCounts(lanes: WorkerHandoverLane[]) {
  return lanes.reduce(
    (counts, lane) => {
      counts[lane] += 1;
      return counts;
    },
    {
      active_given: 0,
      active_received: 0,
      history: 0,
      reverted: 0,
    } satisfies Record<WorkerHandoverLane, number>,
  );
}

export function getManagerHandoverLaneCounts(lanes: ManagerHandoverLane[]) {
  return lanes.reduce(
    (counts, lane) => {
      counts[lane] += 1;
      return counts;
    },
    {
      active: 0,
      history: 0,
      reverted: 0,
    } satisfies Record<ManagerHandoverLane, number>,
  );
}

export function toManagerHandoverSummaryResponse(handover: ManagerHandoverRow) {
  return {
    ...toHandoverSummaryResponse(handover),
    lane: handover.lane,
  };
}
