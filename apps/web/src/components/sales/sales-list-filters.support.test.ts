import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fromSalesDateRange,
  toSalesDateRange,
} from "./sales-list-filters.support";

describe("sales list filters support", () => {
  it("maps empty query dates to an undefined range", () => {
    assert.equal(
      toSalesDateRange({
        dateFrom: "",
        dateTo: "",
      }),
      undefined,
    );
  });

  it("maps stored query dates into a date range", () => {
    const range = toSalesDateRange({
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
    });

    assert.equal(range?.from?.toISOString().slice(0, 10), "2026-04-01");
    assert.equal(range?.to?.toISOString().slice(0, 10), "2026-04-30");
  });

  it("maps a date range back to the existing query shape", () => {
    assert.deepEqual(
      fromSalesDateRange({
        from: new Date("2026-04-01T00:00:00.000Z"),
        to: new Date("2026-04-30T00:00:00.000Z"),
      }),
      {
        dateFrom: "2026-04-01",
        dateTo: "2026-04-30",
      },
    );
  });

  it("preserves partial range selection", () => {
    assert.deepEqual(
      fromSalesDateRange({
        from: new Date("2026-04-01T00:00:00.000Z"),
      }),
      {
        dateFrom: "2026-04-01",
        dateTo: "",
      },
    );
  });
});
