import assert from "node:assert/strict";
import test from "node:test";
import type { StockSupplyRequestResponse } from "@shop/contracts";
import {
  filterTransfers,
  getLaneCounts,
  managerTransferLanes,
  workerTransferLanes,
} from "./transfer-workspace.support";

const baseTransfer: StockSupplyRequestResponse = {
  approvedQuantity: 3,
  createdAt: "2026-04-25T08:00:00.000Z",
  dispatchedAt: null,
  dispatchedBy: null,
  gtnReference: null,
  locationId: "22222222-2222-4222-8222-222222222222",
  locationName: "Airport Branch",
  notes: null,
  receivedAt: null,
  reference: "SUP-001",
  requesterEmail: "worker@example.com",
  requesterId: "11111111-1111-4111-8111-111111111111",
  requesterName: "Worker One",
  requestedQuantity: 3,
  resolutionNotes: null,
  resolvedAt: null,
  resolvedBy: null,
  skuId: "33333333-3333-4333-8333-333333333333",
  skuSnapshot: {
    productName: "Canvas Tote",
    sku: "BAG-001",
    variantName: "Natural",
  },
  sourceLocationId: "44444444-4444-4444-8444-444444444444",
  sourceLocationName: "Main Warehouse",
  sourceReservationStatus: null,
  status: "pending",
  supplyRequestId: "55555555-5555-4555-8555-555555555555",
  transferReference: "TRF-001",
};

test("manager lane counts distinguish review, reserved, transit, and completed", () => {
  const counts = getLaneCounts(
    [
      baseTransfer,
      {
        ...baseTransfer,
        status: "approved",
        sourceReservationStatus: "active",
      },
      { ...baseTransfer, status: "dispatched", supplyRequestId: "dispatched" },
      { ...baseTransfer, status: "received", supplyRequestId: "received" },
    ],
    managerTransferLanes,
  );

  assert.equal(counts.needs_review, 1);
  assert.equal(counts.reserved, 1);
  assert.equal(counts.in_transit, 1);
  assert.equal(counts.completed, 1);
});

test("worker lane filtering finds open and in-transit transfers by search", () => {
  const items: StockSupplyRequestResponse[] = [
    baseTransfer,
    {
      ...baseTransfer,
      reference: "SUP-002",
      skuSnapshot: { ...baseTransfer.skuSnapshot, productName: "Desk Lamp" },
      status: "dispatched",
      supplyRequestId: "dispatched",
    },
  ];

  assert.equal(
    filterTransfers(items, workerTransferLanes, "open", "tote").length,
    1,
  );
  assert.equal(
    filterTransfers(items, workerTransferLanes, "in_transit", "lamp").length,
    1,
  );
});
