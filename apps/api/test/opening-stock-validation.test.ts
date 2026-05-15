import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { assertOpeningStockLinesReady } from "../src/modules/stock/opening-stock-validation.js";

const variant = {
  id: "11111111-1111-4111-8111-111111111111",
  product: {},
  sku: "RICE-5KG",
};

describe("assertOpeningStockLinesReady", () => {
  it("allows unresolved SKU/location pairs", () => {
    assert.doesNotThrow(() =>
      assertOpeningStockLinesReady({
        existingBalanceSkuIds: new Set(),
        existingInitializationSkuIds: new Set(),
        lines: [{ note: undefined, onHandQuantity: 10, sku: "RICE-5KG" }],
        variantBySku: new Map([["RICE-5KG", variant]]),
      }),
    );
  });

  it("returns structured row details for already initialized SKUs", () => {
    assert.throws(
      () =>
        assertOpeningStockLinesReady({
          existingBalanceSkuIds: new Set([variant.id]),
          existingInitializationSkuIds: new Set(),
          lines: [{ note: undefined, onHandQuantity: 10, sku: "RICE-5KG" }],
          variantBySku: new Map([["RICE-5KG", variant]]),
        }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 409);
        assert.deepEqual(error.details?.lines, [
          {
            index: 0,
            message:
              'SKU "RICE-5KG" already has opening stock at this location.',
            reason: "already_initialized",
            sku: "RICE-5KG",
          },
        ]);
        return true;
      },
    );
  });

  it("returns structured row details for unknown SKUs", () => {
    assert.throws(
      () =>
        assertOpeningStockLinesReady({
          existingBalanceSkuIds: new Set(),
          existingInitializationSkuIds: new Set(),
          lines: [{ note: undefined, onHandQuantity: 10, sku: "UNKNOWN" }],
          variantBySku: new Map(),
        }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 409);
        assert.match(JSON.stringify(error.details), /unknown_sku/);
        return true;
      },
    );
  });
});
