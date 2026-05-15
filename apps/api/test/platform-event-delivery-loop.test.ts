import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventDeliveryService } from "../src/modules/events/platform-event-delivery.service.js";
import { PlatformEventDeliveryLoop } from "../src/modules/events/platform-event-delivery-loop.js";

describe("PlatformEventDeliveryLoop", () => {
  it("logs dispatch failures and keeps the API process alive for retry", async () => {
    const loggedMessages: string[] = [];
    const loop = new PlatformEventDeliveryLoop(
      {
        async dispatchAvailable() {
          throw new Error("database connection timeout");
        },
      } as unknown as PlatformEventDeliveryService,
      {
        logger: {
          error(_details, message) {
            loggedMessages.push(message);
          },
        },
        pollIntervalMs: 60_000,
      },
    );

    loop.start();
    await new Promise((resolve) => setImmediate(resolve));
    loop.stop();

    assert.deepEqual(loggedMessages, [
      "Platform event delivery loop failed; it will retry on the next poll",
    ]);
  });
});
