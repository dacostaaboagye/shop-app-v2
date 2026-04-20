import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import { PlatformEventDeliveryService } from "../src/modules/events/platform-event-delivery.service.js";
import type { ClaimedPlatformEvent } from "../src/modules/events/postgres-platform-event.repository.js";

describe("PlatformEventDeliveryService", () => {
  it("projects notifications, marks delivered, and then publishes live", async () => {
    const calls: string[] = [];
    const service = new PlatformEventDeliveryService({
      eventLogRepository: {
        async claimPendingBatch() {
          calls.push("claim");
          return [makeClaimedEvent()];
        },
        async markDelivered() {
          calls.push("delivered");
        },
        async markFailed() {
          calls.push("failed");
        },
      },
      livePublisher: {
        async publish() {
          calls.push("live");
        },
      },
      notificationProjector: {
        async project() {
          calls.push("project");
        },
      },
    });

    const result = await service.dispatchAvailable({
      now: new Date("2026-04-19T22:00:00.000Z"),
    });

    assert.deepEqual(calls, ["claim", "project", "delivered", "live"]);
    assert.deepEqual(result, {
      claimedCount: 1,
      deliveredCount: 1,
      failedCount: 0,
      pendingRetryCount: 0,
    });
  });

  it("requeues a failed delivery before the max attempt threshold", async () => {
    const markFailedCalls: Array<{ lastError: string; terminal: boolean }> = [];
    const service = new PlatformEventDeliveryService({
      eventLogRepository: {
        async claimPendingBatch() {
          return [makeClaimedEvent({ deliveryAttempts: 2 })];
        },
        async markDelivered() {
          throw new Error("should not mark delivered");
        },
        async markFailed(input) {
          markFailedCalls.push({
            lastError: input.lastError,
            terminal: input.terminal,
          });
        },
      },
      notificationProjector: {
        async project() {
          throw new Error("projection unavailable");
        },
      },
    });

    const result = await service.dispatchAvailable({
      now: new Date("2026-04-19T22:00:00.000Z"),
    });

    assert.equal(markFailedCalls.length, 1);
    assert.equal(markFailedCalls[0]?.terminal, false);
    assert.match(markFailedCalls[0]?.lastError ?? "", /projection unavailable/);
    assert.deepEqual(result, {
      claimedCount: 1,
      deliveredCount: 0,
      failedCount: 0,
      pendingRetryCount: 1,
    });
  });

  it("marks the event failed after the final delivery attempt", async () => {
    const markFailedCalls: Array<{ eventId: string; terminal: boolean }> = [];
    const service = new PlatformEventDeliveryService({
      eventLogRepository: {
        async claimPendingBatch() {
          return [makeClaimedEvent({ deliveryAttempts: 5 })];
        },
        async markDelivered() {
          throw new Error("should not mark delivered");
        },
        async markFailed(input) {
          markFailedCalls.push({
            eventId: input.eventId,
            terminal: input.terminal,
          });
        },
      },
      maxAttempts: 5,
      notificationProjector: {
        async project() {
          throw new Error("projection unavailable");
        },
      },
    });

    const result = await service.dispatchAvailable({
      now: new Date("2026-04-19T22:00:00.000Z"),
    });

    assert.deepEqual(markFailedCalls, [{ eventId: "evt-1", terminal: true }]);
    assert.deepEqual(result, {
      claimedCount: 1,
      deliveredCount: 0,
      failedCount: 1,
      pendingRetryCount: 0,
    });
  });
});

function makeClaimedEvent(
  overrides: Partial<ClaimedPlatformEvent> = {},
): ClaimedPlatformEvent {
  return {
    deliveryAttempts: 1,
    event: makeEvent(),
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<PlatformEventRecord> = {},
): PlatformEventRecord {
  return {
    actor: { userSlug: "worker-a" },
    audience: [{ kind: "user", userId: "worker-a" }],
    id: "evt-1",
    occurredAt: "2026-04-19T22:00:00.000Z",
    payload: { status: "pending" },
    resource: { kind: "stock_transfer_request", reference: "SUP-0001" },
    summary: "SUP-0001 changed.",
    type: "transfer.requested",
    ...overrides,
  };
}
