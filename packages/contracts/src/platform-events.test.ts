import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { platformEventDeliveryHealthResponseSchema } from "./platform-events.js";

describe("platform event contracts", () => {
  it("accepts a delivery health response", () => {
    const parsed = platformEventDeliveryHealthResponseSchema.parse({
      deliveredCount: 42,
      failedCount: 1,
      generatedAt: "2026-04-20T00:00:00.000Z",
      oldestFailedAt: "2026-04-19T23:00:00.000Z",
      oldestPendingAt: null,
      pendingCount: 0,
      processingCount: 2,
      statusCounts: [
        { count: 0, status: "pending" },
        { count: 2, status: "processing" },
        { count: 42, status: "delivered" },
        { count: 1, status: "failed" },
      ],
      stuckProcessingCount: 1,
    });

    assert.equal(parsed.failedCount, 1);
  });
});
