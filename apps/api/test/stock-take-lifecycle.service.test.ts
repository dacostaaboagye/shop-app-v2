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
    } satisfies Pick<PostgresStockTakeLifecycleRepository, "cancelSession">);

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
});
