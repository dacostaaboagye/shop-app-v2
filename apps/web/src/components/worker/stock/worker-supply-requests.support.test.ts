import assert from "node:assert/strict";
import test from "node:test";
import type { StockSupplyRequestResponse } from "@shop/contracts";
import {
  filterWorkerSupplyRequests,
  getWorkerSupplyRequestCounts,
} from "./worker-supply-requests.support";

const baseRequest: StockSupplyRequestResponse = {
  approvedQuantity: null,
  createdAt: "2026-04-20T00:00:00.000Z",
  dispatchedAt: null,
  dispatchedBy: null,
  gtnReference: null,
  locationId: "22222222-2222-4222-8222-222222222222",
  locationName: "Airport Branch",
  notes: null,
  reference: "SR-001",
  requestGroupReference: null,
  requestedQuantity: 3,
  requesterEmail: "worker@example.com",
  requesterId: "11111111-1111-4111-8111-111111111111",
  requesterName: "Worker One",
  receivedAt: null,
  receivedQuantity: null,
  receiptDiscrepancyNotes: null,
  receiptDiscrepancyReason: null,
  resolvedAt: null,
  resolvedBy: null,
  resolutionNotes: null,
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
  transferReference: null,
};

test("counts worker supply request lanes", () => {
  const counts = getWorkerSupplyRequestCounts([
    baseRequest,
    { ...baseRequest, status: "approved", supplyRequestId: "approved" },
    { ...baseRequest, status: "dispatched", supplyRequestId: "dispatched" },
    { ...baseRequest, status: "received", supplyRequestId: "received" },
  ]);

  assert.equal(counts.all, 4);
  assert.equal(counts.active, 3);
  assert.equal(counts.closed, 1);
  assert.equal(counts.dispatched, 1);
});

test("filters worker supply requests by active lane and search", () => {
  const items: StockSupplyRequestResponse[] = [
    baseRequest,
    {
      ...baseRequest,
      reference: "SR-002",
      skuSnapshot: { ...baseRequest.skuSnapshot, productName: "Desk Lamp" },
      status: "received",
      supplyRequestId: "received",
    },
  ];

  assert.equal(filterWorkerSupplyRequests(items, "active", "tote").length, 1);
  assert.equal(filterWorkerSupplyRequests(items, "active", "lamp").length, 0);
  assert.equal(filterWorkerSupplyRequests(items, "closed", "lamp").length, 1);
});
