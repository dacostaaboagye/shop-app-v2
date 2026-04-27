import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProcurementTimeline,
  formatProcurementStatus,
  nextProcurementActions,
} from "./supplier-procurement-list.support";

const BASE_ORDER = {
  approvedAt: null,
  cancelledAt: null,
  createdAt: "2026-04-26T12:00:00.000Z",
  destinationLocationName: "Store A",
  destinationLocationSlug: "store-a",
  expectedAt: null,
  lines: [
    {
      approvedQuantity: null,
      productName: "Travel Pack",
      productSlug: "travel-pack",
      receivedQuantity: 0,
      requestedQuantity: 4,
      sku: "TRAVEL-PACK-001",
      unitCost: "10.00",
      variantName: "Standard",
      variantSlug: "standard",
    },
  ],
  notes: "Urgent replenishment",
  orderedAt: null,
  receivedAt: null,
  reference: "PO-20260426-0001",
  status: "draft" as const,
};

describe("supplier procurement list support", () => {
  it("builds a timeline with the current draft stage highlighted", () => {
    const timeline = buildProcurementTimeline(BASE_ORDER);

    assert.equal(timeline[0]?.label, "Draft Created");
    assert.equal(timeline[0]?.isCurrent, true);
    assert.equal(timeline[1]?.isComplete, false);
  });

  it("includes received progress for partially received orders", () => {
    const timeline = buildProcurementTimeline({
      ...BASE_ORDER,
      approvedAt: "2026-04-26T13:00:00.000Z",
      orderedAt: "2026-04-26T14:00:00.000Z",
      receivedAt: "2026-04-27T10:00:00.000Z",
      status: "partially_received",
    });

    const receivedStep = timeline.find((item) => item.isCurrent);
    assert.equal(receivedStep?.label, "Partially Received");
    assert.equal(receivedStep?.isComplete, true);
  });

  it("shows only valid next actions for the current status", () => {
    assert.deepEqual(nextProcurementActions("draft"), ["submit", "cancel"]);
    assert.deepEqual(nextProcurementActions("approved"), ["order", "cancel"]);
    assert.deepEqual(nextProcurementActions("closed"), []);
  });

  it("formats procurement statuses for human-readable display", () => {
    assert.equal(formatProcurementStatus("ordered"), "Ordered");
    assert.equal(
      formatProcurementStatus("partially_received"),
      "Partially Received",
    );
  });
});
