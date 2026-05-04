import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { assertOpeningCountAllowed } from "../src/modules/stock/stock-count-opening-guard.js";

describe("assertOpeningCountAllowed", () => {
  it("blocks opening counts from the generic count path", () => {
    assert.throws(
      () =>
        assertOpeningCountAllowed({
          existingBalance: null,
          locationSlug: "main-warehouse",
          reasonCode: "opening_count",
          sku: "RICE-5KG",
        }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "conflict");
        assert.equal(error.title, "Opening stock requires setup flow");
        return true;
      },
    );
  });

  it("allows correction reasons for initialized balances", () => {
    assert.doesNotThrow(() =>
      assertOpeningCountAllowed({
        existingBalance: { id: "balance-1" },
        locationSlug: "main-warehouse",
        reasonCode: "correction",
        sku: "RICE-5KG",
      }),
    );
  });

  it("blocks normal counts before opening stock is initialized", () => {
    assert.throws(
      () =>
        assertOpeningCountAllowed({
          existingBalance: null,
          locationSlug: "main-warehouse",
          reasonCode: "cycle_count",
          sku: "RICE-5KG",
        }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.title, "Stock balance not initialized");
        return true;
      },
    );
  });
});
