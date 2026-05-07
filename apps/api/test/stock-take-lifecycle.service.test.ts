import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANCELLABLE_STOCK_TAKE_STATUSES,
  type PostgresStockTakeLifecycleRepository,
} from "../src/modules/stock/postgres-stock-take-lifecycle.repository.js";
import { StockTakeLifecycleService } from "../src/modules/stock/stock-take-lifecycle.service.js";

describe("StockTakeLifecycleService", () => {
  it("only allows generated, counted, or reviewed sessions to be cancelled", () => {
    assert.deepEqual(
      [...CANCELLABLE_STOCK_TAKE_STATUSES],
      ["generated", "counted", "reviewed"],
    );
  });

  it("returns a conflict when the repository cannot cancel the session", async () => {
    const service = new StockTakeLifecycleService({
      async cancelSession() {
        return null;
      },
      async updateLineCounts() {
        return { kind: "not_found" };
      },
    } satisfies Pick<
      PostgresStockTakeLifecycleRepository,
      "cancelSession" | "updateLineCounts"
    >);

    await assert.rejects(
      () =>
        service.cancelSession({
          portal: "admin",
          reference: "STKTAKE-2026-0001",
        }),
      {
        statusCode: 409,
        title: "Stock take cannot be deleted",
      },
    );
  });

  it("rejects line-count updates with a 404 when the session is missing", async () => {
    const service = new StockTakeLifecycleService({
      async cancelSession() {
        return null;
      },
      async updateLineCounts() {
        return { kind: "not_found" };
      },
    } satisfies Pick<
      PostgresStockTakeLifecycleRepository,
      "cancelSession" | "updateLineCounts"
    >);

    await assert.rejects(
      () =>
        service.updateLineCounts({
          entries: [{ countedQuantity: 12, lineNumber: 1, note: null }],
          reference: "STKTAKE-2026-0001",
        }),
      { statusCode: 404 },
    );
  });

  it("rejects line-count updates with a 409 when the session is applied", async () => {
    const service = new StockTakeLifecycleService({
      async cancelSession() {
        return null;
      },
      async updateLineCounts() {
        return { kind: "conflict", status: "applied" };
      },
    } satisfies Pick<
      PostgresStockTakeLifecycleRepository,
      "cancelSession" | "updateLineCounts"
    >);

    await assert.rejects(
      () =>
        service.updateLineCounts({
          entries: [{ countedQuantity: 12, lineNumber: 1, note: null }],
          reference: "STKTAKE-2026-0001",
        }),
      { statusCode: 409, title: "Stock take cannot be edited" },
    );
  });

  it("returns the updated count for a successful line-count update", async () => {
    const service = new StockTakeLifecycleService({
      async cancelSession() {
        return null;
      },
      async updateLineCounts() {
        return {
          kind: "ok",
          status: "generated",
          stockTakeReference: "STKTAKE-2026-0001",
          updatedCount: 2,
        };
      },
    } satisfies Pick<
      PostgresStockTakeLifecycleRepository,
      "cancelSession" | "updateLineCounts"
    >);

    const response = await service.updateLineCounts({
      entries: [
        { countedQuantity: 12, lineNumber: 1, note: null },
        { countedQuantity: null, lineNumber: 2, note: "skipped" },
      ],
      reference: "STKTAKE-2026-0001",
    });

    assert.equal(response.updatedCount, 2);
    assert.equal(response.errors.length, 0);
    assert.equal(response.status, "generated");
  });
});
