import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupplyRequestRow } from "../src/modules/stock/postgres-supply-request.repository.js";
import { formatStockSupplyEventSummary } from "../src/modules/stock/stock-supply-event-summary.js";

describe("formatStockSupplyEventSummary", () => {
  it("formats a human-readable transfer notification summary", () => {
    assert.equal(
      formatStockSupplyEventSummary({
        action: "approved",
        supplyRequest: makeSupplyRequestRow({ approvedQuantity: 3 }),
      }),
      "SUP-0001: Travel Pack (TRAVEL-001) approved for 3 units from Central Warehouse to Airport Store.",
    );
  });

  it("includes GTN reference for dispatch and receipt events", () => {
    assert.equal(
      formatStockSupplyEventSummary({
        action: "dispatched",
        gtnReference: "GTN-0007",
        supplyRequest: makeSupplyRequestRow({ approvedQuantity: 1 }),
      }),
      "SUP-0001: Travel Pack (TRAVEL-001) dispatched for 1 unit from Central Warehouse to Airport Store. GTN GTN-0007.",
    );
  });
});

function makeSupplyRequestRow(
  overrides: Partial<SupplyRequestRow> = {},
): SupplyRequestRow {
  return {
    approvedQuantity: null,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    dispatchedAt: null,
    dispatchedBy: null,
    gtnReference: null,
    id: "11111111-1111-4111-8111-111111111111",
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Airport Store",
    notes: null,
    receivedAt: null,
    reference: "SUP-0001",
    requestGroupReference: null,
    sourceReservationStatus: null,
    transferReference: "TRF-0001",
    requesterEmail: "worker@example.com",
    requesterId: "33333333-3333-4333-8333-333333333333",
    requesterName: "Worker One",
    requestedQuantity: 5,
    resolutionNotes: null,
    resolvedAt: null,
    resolvedBy: null,
    skuId: "44444444-4444-4444-8444-444444444444",
    skuSnapshot: {
      productName: "Travel Pack",
      sku: "TRAVEL-001",
      variantName: "Default",
    },
    sourceLocationId: "55555555-5555-4555-8555-555555555555",
    sourceLocationName: "Central Warehouse",
    status: "pending",
    ...overrides,
  };
}
