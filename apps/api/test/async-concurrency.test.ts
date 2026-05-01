import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapWithConcurrency } from "../src/modules/_core/async-concurrency.js";

describe("mapWithConcurrency", () => {
  it("preserves output ordering even when workers complete out of order", async () => {
    const results = await mapWithConcurrency(
      [10, 20, 30, 40, 50],
      3,
      async (item) => {
        // Smaller items wait longer — finish order ≠ input order.
        await new Promise((resolve) => setTimeout(resolve, 50 - item / 2));
        return item * 2;
      },
    );

    assert.deepEqual(results, [20, 40, 60, 80, 100]);
  });

  it("never exceeds the configured concurrency", async () => {
    let inFlight = 0;
    let observedMax = 0;

    await mapWithConcurrency([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3, async () => {
      inFlight++;
      observedMax = Math.max(observedMax, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return null;
    });

    assert.equal(observedMax, 3);
  });

  it("handles fewer items than concurrency without spinning unused slots", async () => {
    const order: number[] = [];
    await mapWithConcurrency([1, 2], 10, async (item) => {
      order.push(item);
      return item;
    });
    assert.deepEqual(order.sort(), [1, 2]);
  });

  it("returns an empty array on empty input", async () => {
    const results = await mapWithConcurrency([], 5, async () => "never");
    assert.deepEqual(results, []);
  });

  it("rejects when the worker throws and lets in-flight work settle", async () => {
    let started = 0;
    let finished = 0;

    await assert.rejects(
      () =>
        mapWithConcurrency([1, 2, 3, 4], 2, async (item) => {
          started++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          finished++;
          if (item === 2) throw new Error("boom");
          return item;
        }),
      /boom/,
    );

    // Both initial parallel slots had a chance to begin.
    assert.ok(started >= 2);
    assert.ok(finished >= 1);
  });

  it("rejects on non-positive concurrency", async () => {
    await assert.rejects(
      () => mapWithConcurrency([1], 0, async () => null),
      /positive integer/,
    );
    await assert.rejects(
      () => mapWithConcurrency([1], -1, async () => null),
      /positive integer/,
    );
  });
});
