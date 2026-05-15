import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasStockMovementFilter,
  STOCK_MOVEMENT_DEFAULT_FILTER,
  toManagerMovementQuery,
} from "./stock-movement-history.support";

describe("stock movement history support", () => {
  it("detects movement filters that should change empty-state copy", () => {
    assert.equal(hasStockMovementFilter(STOCK_MOVEMENT_DEFAULT_FILTER), false);
    assert.equal(
      hasStockMovementFilter({
        ...STOCK_MOVEMENT_DEFAULT_FILTER,
        movementType: "goods_receipt",
      }),
      true,
    );
  });

  it("builds manager movement queries with the selected location slug", () => {
    const query = toManagerMovementQuery(
      { ...STOCK_MOVEMENT_DEFAULT_FILTER, q: "rice" },
      "airport-store",
    );

    assert.equal(query.locationSlug, "airport-store");
    assert.equal(query.q, "rice");
  });
});
