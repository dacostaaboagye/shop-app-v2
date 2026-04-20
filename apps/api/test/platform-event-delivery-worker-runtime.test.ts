import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlatformEventDeliveryWorkerRuntime } from "../src/modules/events/platform-event-delivery-worker-runtime.js";

describe("PlatformEventDeliveryWorkerRuntime", () => {
  it("starts the delivery loop when enabled", async () => {
    const calls: string[] = [];
    const runtime = createPlatformEventDeliveryWorkerRuntime({
      databasePool: { async end() { calls.push("pool-end"); } },
      deliveryEnabled: true,
      deliveryLoop: {
        start() { calls.push("loop-start"); },
        stop() { calls.push("loop-stop"); },
      },
    });

    const started = await runtime.start();

    assert.equal(started, true);
    assert.deepEqual(calls, ["loop-start"]);
  });

  it("does not start the delivery loop when disabled", async () => {
    const calls: string[] = [];
    const runtime = createPlatformEventDeliveryWorkerRuntime({
      databasePool: { async end() { calls.push("pool-end"); } },
      deliveryEnabled: false,
      deliveryLoop: {
        start() { calls.push("loop-start"); },
        stop() { calls.push("loop-stop"); },
      },
    });

    const started = await runtime.start();

    assert.equal(started, false);
    assert.deepEqual(calls, []);
  });

  it("stops the delivery loop before closing the database pool", async () => {
    const calls: string[] = [];
    const runtime = createPlatformEventDeliveryWorkerRuntime({
      databasePool: { async end() { calls.push("pool-end"); } },
      deliveryEnabled: true,
      deliveryLoop: {
        start() { calls.push("loop-start"); },
        stop() { calls.push("loop-stop"); },
      },
    });

    await runtime.stop();

    assert.deepEqual(calls, ["loop-stop", "pool-end"]);
  });
});
