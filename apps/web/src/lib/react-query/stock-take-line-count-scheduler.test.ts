import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeLineCountEntry } from "@/lib/react-query/stock-take-counts";
import { StockTakeLineCountScheduler } from "./stock-take-line-count-scheduler";

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
