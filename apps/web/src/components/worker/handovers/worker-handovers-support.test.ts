import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkerHandoverSummary } from "@shop/contracts";
import {
  emptyLaneCounts,
  filterWorkerHandovers,
} from "./worker-handovers-support";

describe("worker handover support", () => {
  it("filters handovers by lane and search text", () => {
    const rows = [
      handover({ lane: "active_received", productName: "Uniform Shirt" }),
      handover({ lane: "active_given", productName: "Barcode Scanner" }),
      handover({ lane: "active_received", productName: "Receipt Printer" }),
    ];

    const filtered = filterWorkerHandovers({
      items: rows,
      lane: "active_received",
      search: "printer",
    });

    assert.deepEqual(
      filtered.map((item) => item.productName),
      ["Receipt Printer"],
    );
  });

  it("builds zeroed lane counts", () => {
    assert.deepEqual(emptyLaneCounts(), {
      active_given: 0,
      active_received: 0,
      history: 0,
      reverted: 0,
    });
  });
});

function handover(
  overrides: Partial<WorkerHandoverSummary>,
): WorkerHandoverSummary {
  return {
    canRevert: true,
    currentWorkerName: "Worker A",
    currentWorkerSlug: "worker-a",
    fromWorkerName: "Worker B",
    fromWorkerSlug: "worker-b",
    handoverChainId: "11111111-1111-4111-8111-111111111111",
    lane: "active_received",
    latestEventType: "handover_in",
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "East Legon",
    primaryImageUrl: null,
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    quantity: 2,
    sku: "UNI-SHIRT-M",
    skuId: "33333333-3333-4333-8333-333333333333",
    startedAt: "2026-05-14T10:00:00.000Z",
    toWorkerName: "Worker A",
    toWorkerSlug: "worker-a",
    updatedAt: "2026-05-14T10:01:00.000Z",
    variantName: "Medium",
    variantSlug: "medium",
    ...overrides,
  };
}
