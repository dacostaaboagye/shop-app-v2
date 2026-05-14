import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handoverRecipientListResponseSchema,
  workerHandoverListResponseSchema,
} from "./assignment-handovers.js";

const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const SKU_ID = "33333333-3333-4333-8333-333333333333";
const WORKER_ID = "44444444-4444-4444-8444-444444444444";
const CHAIN_ID = "55555555-5555-4555-8555-555555555555";

describe("assignment handover contracts", () => {
  it("accepts worker handover list rows and lane counts", () => {
    const parsed = workerHandoverListResponseSchema.parse({
      items: [
        {
          canRevert: true,
          currentWorkerName: "Receiving Worker",
          currentWorkerSlug: "receiving-worker",
          fromWorkerName: "Source Worker",
          fromWorkerSlug: "source-worker",
          handoverChainId: CHAIN_ID,
          lane: "active_received",
          latestEventType: "handover_in",
          locationId: LOCATION_ID,
          locationName: "East Legon",
          primaryImageUrl: null,
          productName: "Uniform Shirt",
          productSlug: "uniform-shirt",
          quantity: 3,
          sku: "UNI-SHIRT-M",
          skuId: SKU_ID,
          startedAt: "2026-05-14T10:00:00.000Z",
          toWorkerName: "Receiving Worker",
          toWorkerSlug: "receiving-worker",
          updatedAt: "2026-05-14T10:01:00.000Z",
          variantName: "Medium",
          variantSlug: "medium",
        },
      ],
      laneCounts: {
        active_given: 0,
        active_received: 1,
        history: 0,
        reverted: 0,
      },
      locationId: LOCATION_ID,
      locationName: "East Legon",
    });

    assert.equal(parsed.items[0]?.handoverChainId, CHAIN_ID);
    assert.equal(parsed.laneCounts.active_received, 1);
  });

  it("accepts a minimal eligible handover recipient list", () => {
    const parsed = handoverRecipientListResponseSchema.parse({
      items: [
        {
          activeAssignmentCount: 2,
          firstName: "Ama",
          lastName: "Worker",
          primaryImageUrl: null,
          userId: WORKER_ID,
          userSlug: "ama-worker",
        },
      ],
      locationId: LOCATION_ID,
      locationName: "East Legon",
    });

    assert.equal(parsed.items[0]?.userSlug, "ama-worker");
  });
});
