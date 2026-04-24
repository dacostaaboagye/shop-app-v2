import assert from "node:assert/strict";
import test from "node:test";
import type { StockSupplyRequestResponse } from "@shop/contracts";
import {
  filterSupplyRequests,
  getSupplyRequestCounts,
} from "./manager-supply-requests.support";

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
  requestedQuantity: 3,
  requesterEmail: "worker@example.com",
  requesterId: "11111111-1111-4111-8111-111111111111",
  requesterName: "Worker One",
  receivedAt: null,
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
  status: "pending",
  supplyRequestId: "55555555-5555-4555-8555-555555555555",
};

test("counts active and closed manager supply request lanes", () => {
  const counts = getSupplyRequestCounts([
    baseRequest,
    { ...baseRequest, status: "approved", supplyRequestId: "approved" },
    { ...baseRequest, status: "dispatched", supplyRequestId: "dispatched" },
    { ...baseRequest, status: "received", supplyRequestId: "received" },
  ]);

  assert.equal(counts.all, 4);
  assert.equal(counts.pending, 1);
  assert.equal(counts.approved, 1);
  assert.equal(counts.dispatched, 1);
  assert.equal(counts.closed, 1);
});

test("filters manager supply requests by status and searchable fields", () => {
  const items: StockSupplyRequestResponse[] = [
    baseRequest,
    {
      ...baseRequest,
      reference: "SR-002",
      skuSnapshot: { ...baseRequest.skuSnapshot, productName: "Desk Lamp" },
      status: "approved" as const,
      supplyRequestId: "approved",
    },
  ];

  assert.equal(filterSupplyRequests(items, "approved", "lamp").length, 1);
  assert.equal(filterSupplyRequests(items, "pending", "lamp").length, 0);
});
