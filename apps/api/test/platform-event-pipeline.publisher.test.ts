import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import { PlatformEventPipelinePublisher } from "../src/modules/events/platform-event-pipeline.publisher.js";

describe("PlatformEventPipelinePublisher", () => {
  it("persists the event and triggers delivery", async () => {
    const calls: string[] = [];
    const publisher = new PlatformEventPipelinePublisher({
      afterAppend() {
        calls.push("after-append");
      },
      eventLogRepository: {
        async append() {
          calls.push("append");
        },
      },
    });

    await publisher.publish(makeEvent());

    assert.deepEqual(calls, ["append", "after-append"]);
  });

  it("can append inside a caller-owned transaction before notifying delivery", async () => {
    const calls: string[] = [];
    const transactionClient = {};
    const publisher = new PlatformEventPipelinePublisher({
      afterAppend() {
        calls.push("after-append");
      },
      eventLogRepository: {
        async append() {
          throw new Error("append should not own the transaction");
        },
        async appendWithinTransaction(_event, db) {
          assert.equal(db, transactionClient);
          calls.push("append-in-transaction");
        },
      },
    });

    await publisher.appendWithinTransaction(
      makeEvent(),
      transactionClient as never,
    );
    assert.deepEqual(calls, ["append-in-transaction"]);

    await publisher.notifyAppendCommitted();
    assert.deepEqual(calls, ["append-in-transaction", "after-append"]);
  });
});

function makeEvent(): PlatformEventRecord {
  return {
    actor: { userSlug: "worker-a" },
    audience: [{ kind: "user", userId: "worker-a" }],
    id: "evt-1",
    occurredAt: "2026-04-19T22:00:00.000Z",
    payload: { status: "pending" },
    resource: { kind: "stock_transfer_request", reference: "SUP-0001" },
    summary: "SUP-0001 changed.",
    type: "transfer.requested",
  };
}
