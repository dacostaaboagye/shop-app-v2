import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import { StockSupplyService } from "../src/modules/stock/stock-supply.service.js";

const NOW = new Date("2026-04-20T01:30:00.000Z");

describe("StockSupplyService", () => {
  it("appends the requested event inside the same transaction as the request insert", async () => {
    const calls: string[] = [];
    const tx = createInsertOnlyTx(calls);
    let inTransaction = false;
    let appendedEvent: PlatformEventRecord | null = null;

    const service = new StockSupplyService(
      {
        async transaction(
          callback: (transaction: typeof tx) => Promise<unknown>,
        ) {
          inTransaction = true;
          const result = await callback(tx);
          inTransaction = false;
          return result;
        },
      } as never,
      {
        async generateReference() {
          return "unused";
        },
      } as never,
      {
        async appendWithinTransaction(event, db) {
          assert.equal(inTransaction, true);
          assert.equal(db, tx);
          appendedEvent = event;
          calls.push("append-event");
        },
        async notifyAppendCommitted() {
          assert.equal(inTransaction, false);
          calls.push("notify-delivery");
        },
      },
    );

    const row = await service.createRequest({
      actor: { userId: "worker-1", userSlug: "worker-one" },
      locationId: "location-destination",
      notes: "Need stock",
      reference: "SUP-0001",
      requestedQuantity: 4,
      requesterId: "worker-1",
      skuId: "sku-1",
      skuSnapshot: {
        productName: "Travel Pack",
        sku: "TRAVEL-PACK",
        variantName: "Standard",
      },
      sourceLocationId: "location-source",
    });

    assert.deepEqual(calls, [
      "insert-stock-request",
      "append-event",
      "notify-delivery",
    ]);
    assert.equal(row.reference, "SUP-0001");
    const recordedEvent = appendedEvent as PlatformEventRecord | null;
    assert.ok(recordedEvent);
    assert.equal(recordedEvent.type, "transfer.requested");
    assert.equal(recordedEvent.resource.reference, "SUP-0001");
  });
});

function createInsertOnlyTx(calls: string[]) {
  return {
    insert() {
      return {
        values() {
          return {
            async returning() {
              calls.push("insert-stock-request");
              return [makeSupplyRequestRecord()];
            },
          };
        },
      };
    },
  };
}

function makeSupplyRequestRecord() {
  return {
    approvedQuantity: null,
    createdAt: NOW,
    dispatchedAt: null,
    dispatchedBy: null,
    id: "request-1",
    locationId: "location-destination",
    notes: "Need stock",
    receivedAt: null,
    reference: "SUP-0001",
    requestedQuantity: 4,
    requesterId: "worker-1",
    resolutionNotes: null,
    resolvedAt: null,
    resolvedBy: null,
    skuId: "sku-1",
    skuSnapshot: {
      productName: "Travel Pack",
      sku: "TRAVEL-PACK",
      variantName: "Standard",
    },
    sourceLocationId: "location-source",
    status: "pending",
    updatedAt: NOW,
  };
}
