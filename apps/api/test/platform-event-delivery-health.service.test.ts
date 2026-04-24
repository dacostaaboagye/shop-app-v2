import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformEventDeliveryHealthService } from "../src/modules/events/platform-event-delivery-health.service.js";

describe("PlatformEventDeliveryHealthService", () => {
  it("maps repository health into the public contract shape", async () => {
    const service = new PlatformEventDeliveryHealthService({
      processingLeaseMs: 60_000,
      repository: {
        async getHealth(input) {
          assert.equal(
            input.staleProcessingBefore.toISOString(),
            "2026-04-19T23:59:00.000Z",
          );

          return {
            deliveredCount: 5,
            failedCount: 1,
            oldestFailedAt: new Date("2026-04-19T22:00:00.000Z"),
            oldestPendingAt: null,
            pendingCount: 0,
            processingCount: 2,
            statusCounts: [
              { count: 0, status: "pending" },
              { count: 2, status: "processing" },
              { count: 5, status: "delivered" },
              { count: 1, status: "failed" },
            ],
            stuckProcessingCount: 1,
          };
        },
      },
    });

    const result = await service.getHealth({
      now: new Date("2026-04-20T00:00:00.000Z"),
    });

    assert.equal(result.generatedAt, "2026-04-20T00:00:00.000Z");
    assert.equal(result.oldestFailedAt, "2026-04-19T22:00:00.000Z");
    assert.equal(result.stuckProcessingCount, 1);
  });
});
