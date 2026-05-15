import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ManagerHandoverSummary } from "@shop/contracts";
import { filterManagerHandovers } from "./manager-handovers-support";

describe("manager handover support", () => {
  it("filters handovers by manager lane", () => {
    const handovers = [
      handover({ lane: "active", productName: "Uniform Shirt" }),
      handover({ lane: "reverted", productName: "Barcode Scanner" }),
      handover({ lane: "history", productName: "Receipt Printer" }),
    ];

    const active = filterManagerHandovers({
      items: handovers,
      lane: "active",
    });

    assert.deepEqual(
      active.map((item) => item.productName),
      ["Uniform Shirt"],
    );
  });
});

function handover(
  overrides: Partial<ManagerHandoverSummary>,
): ManagerHandoverSummary {
  return {
    canRevert: true,
    currentWorkerName: "Receiver Worker",
    currentWorkerSlug: "receiver-worker",
    fromWorkerName: "Source Worker",
    fromWorkerSlug: "source-worker",
    handoverChainId: "11111111-1111-4111-8111-111111111111",
    lane: "active",
    latestEventType: "handover_in",
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "East Legon",
    primaryImageUrl: null,
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    quantity: 3,
    sku: "UNI-SHIRT-M",
    skuId: "33333333-3333-4333-8333-333333333333",
    startedAt: "2026-05-14T12:00:00.000Z",
    toWorkerName: "Receiver Worker",
    toWorkerSlug: "receiver-worker",
    updatedAt: "2026-05-14T12:10:00.000Z",
    variantName: "Medium",
    variantSlug: "medium",
    ...overrides,
  };
}
