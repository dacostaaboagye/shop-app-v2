import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("platform-event stream parser contract", () => {
  it("keeps the event-stream implementation file present for live notifications", async () => {
    const module = await import("./platform-event-stream");

    assert.equal(typeof module.openPlatformEventStream, "function");
  });
});
