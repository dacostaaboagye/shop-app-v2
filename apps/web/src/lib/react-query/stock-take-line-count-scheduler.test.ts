import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeLineCountEntry } from "@/lib/react-query/stock-take-counts";
import { StockTakeLineCountScheduler } from "./stock-take-line-count-scheduler";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("StockTakeLineCountScheduler", () => {
  it("coalesces rapid edits into a single flush", async () => {
    const flushed: StockTakeLineCountEntry[][] = [];
    const scheduler = new StockTakeLineCountScheduler(
      async (entries) => {
        flushed.push(entries);
        return { ok: true };
      },
      { debounceMs: 5 },
    );

    scheduler.queue({ countedQuantity: 1, lineNumber: 1, note: null });
    scheduler.queue({ countedQuantity: 2, lineNumber: 2, note: null });
    scheduler.queue({ countedQuantity: 3, lineNumber: 1, note: "later" });

    await scheduler.flushNow();

    assert.equal(flushed.length, 1);
    const entries = flushed[0];
    assert.ok(entries);
    assert.equal(entries.length, 2);
    const line1 = entries.find((entry) => entry.lineNumber === 1);
    assert.equal(line1?.countedQuantity, 3);
    assert.equal(line1?.note, "later");
  });

  it("emits begin and done events on a successful flush", async () => {
    const beginCalls: number[][] = [];
    const doneCalls: number[][] = [];
    const scheduler = new StockTakeLineCountScheduler(
      async () => ({ ok: true }),
      {
        debounceMs: 5,
        onFlushBegin: (lines) => beginCalls.push(lines),
        onFlushDone: (lines) => doneCalls.push(lines),
      },
    );

    scheduler.queue({ countedQuantity: 1, lineNumber: 1, note: null });
    await scheduler.flushNow();

    assert.deepEqual(beginCalls, [[1]]);
    assert.deepEqual(doneCalls, [[1]]);
  });

  it("surfaces errors thrown by the flush function", async () => {
    const errorCalls: { lines: number[]; error: unknown }[] = [];
    const scheduler = new StockTakeLineCountScheduler(
      async () => {
        throw new Error("boom");
      },
      {
        debounceMs: 5,
        onFlushError: (lines, error) => errorCalls.push({ error, lines }),
      },
    );

    scheduler.queue({ countedQuantity: 1, lineNumber: 1, note: null });
    await scheduler.flushNow();

    assert.equal(errorCalls.length, 1);
    const error = errorCalls[0]?.error as Error;
    assert.equal(error.message, "boom");
    assert.deepEqual(errorCalls[0]?.lines, [1]);
  });

  it("does not flush when the pending queue is empty", async () => {
    let flushCount = 0;
    const scheduler = new StockTakeLineCountScheduler(
      async () => {
        flushCount += 1;
        return { ok: true };
      },
      { debounceMs: 5 },
    );

    await scheduler.flushNow();

    assert.equal(flushCount, 0);
  });

  it("flushNow awaits an in-flight debounced flush before resolving", async () => {
    const events: string[] = [];
    let resolveFirst: ((value: { ok: boolean }) => void) | null = null;
    let flushIndex = 0;

    const scheduler = new StockTakeLineCountScheduler(
      (entries) => {
        flushIndex += 1;
        const tag = `flush-${flushIndex}-${entries.map((entry) => entry.lineNumber).join(",")}`;
        events.push(`${tag}:start`);
        if (flushIndex === 1) {
          return new Promise<{ ok: boolean }>((resolve) => {
            resolveFirst = resolve;
          });
        }
        events.push(`${tag}:done`);
        return Promise.resolve({ ok: true });
      },
      { debounceMs: 5 },
    );

    // Queue line 1 — debounce fires after 5ms and starts the slow flush.
    scheduler.queue({ countedQuantity: 1, lineNumber: 1, note: null });
    await sleep(15);
    assert.deepEqual(events, ["flush-1-1:start"]);

    // While flush-1 is still running, queue line 2 and immediately call
    // flushNow. The fix must serialise: flushNow waits for flush-1 to
    // resolve before sending flush-2.
    scheduler.queue({ countedQuantity: 2, lineNumber: 2, note: null });
    const review = scheduler.flushNow();

    // Allow microtasks to run; flush-2 must not have started yet because
    // flush-1 is still pending.
    await sleep(5);
    assert.deepEqual(events, ["flush-1-1:start"]);

    // Resolve flush-1.
    const resolver = resolveFirst as ((value: { ok: boolean }) => void) | null;
    assert.ok(resolver);
    resolver({ ok: true });
    await review;

    // After review resolves, flush-2 must have completed.
    assert.ok(events.includes("flush-2-2:start"));
    assert.ok(events.includes("flush-2-2:done"));
  });

  it("dispose clears any pending edits without flushing", async () => {
    let flushCount = 0;
    const scheduler = new StockTakeLineCountScheduler(
      async () => {
        flushCount += 1;
        return { ok: true };
      },
      { debounceMs: 100 },
    );

    scheduler.queue({ countedQuantity: 1, lineNumber: 1, note: null });
    scheduler.dispose();
    await scheduler.flushNow();

    assert.equal(flushCount, 0);
  });
});
