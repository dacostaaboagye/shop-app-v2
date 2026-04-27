import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBulkStockSupplyRequestSchema,
  stockSupplyRequestResponseSchema,
} from "./stock-supply.js";

describe("stock supply contracts", () => {
  it("accepts grouped supply requests with distinct SKUs", () => {
    const parsed = createBulkStockSupplyRequestSchema.parse({
      items: [
        {
          requestedQuantity: 3,
          skuId: "77777777-7777-4777-8777-777777777777",
        },
        {
          requestedQuantity: 1,
          skuId: "77777777-7777-4777-8777-777777777778",
        },
      ],
      locationId: "22222222-2222-4222-8222-222222222221",
      notes: "Need multiple items",
      sourceLocationId: "44444444-4444-4444-8444-444444444441",
    });

    assert.equal(parsed.items.length, 2);
  });

  it("rejects duplicate SKUs inside one grouped request", () => {
    assert.throws(
      () =>
        createBulkStockSupplyRequestSchema.parse({
          items: [
            {
              requestedQuantity: 3,
              skuId: "77777777-7777-4777-8777-777777777777",
            },
            {
              requestedQuantity: 1,
              skuId: "77777777-7777-4777-8777-777777777777",
            },
          ],
          locationId: "22222222-2222-4222-8222-222222222221",
          sourceLocationId: "44444444-4444-4444-8444-444444444441",
        }),
      /Each SKU may only appear once/,
    );
  });

  it("accepts request-group references in response payloads", () => {
    const parsed = stockSupplyRequestResponseSchema.parse({
      approvedQuantity: null,
      createdAt: "2026-04-19T19:30:00.000Z",
      dispatchedAt: null,
      dispatchedBy: null,
      gtnReference: null,
      locationId: "22222222-2222-4222-8222-222222222221",
      locationName: "Store A",
      notes: "Need multiple items",
      receivedAt: null,
      reference: "SUP-0001",
      requestGroupReference: "SUPB-0001",
      requestedQuantity: 3,
      requesterEmail: "worker@example.com",
      requesterId: "11111111-1111-4111-8111-111111111111",
      requesterName: "Worker One",
      resolutionNotes: null,
      resolvedAt: null,
      resolvedBy: null,
      skuId: "77777777-7777-4777-8777-777777777777",
      skuSnapshot: {
        productName: "Travel Pack",
        sku: "TRAVEL-PACK-001",
        variantName: "Standard",
      },
      sourceLocationId: "44444444-4444-4444-8444-444444444441",
      sourceLocationName: "Warehouse A",
      sourceReservationStatus: null,
      status: "pending",
      supplyRequestId: "66666666-6666-4666-8666-666666666666",
      transferReference: "TRF-0001",
    });

    assert.equal(parsed.requestGroupReference, "SUPB-0001");
  });
});
