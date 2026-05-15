import assert from "node:assert/strict";
import test from "node:test";
import type { AdminStockBalanceSummary } from "@shop/contracts";
import {
  buildStockCountRequest,
  canUseOpeningCount,
  createStockCountFormDefaults,
  type StockCountFormValues,
  validateStockCountQuantity,
  validateStockCountSku,
} from "./stock-count-form.support";

const row = {
  availableQuantity: 8,
  inTransitQuantity: 0,
  locationName: "Ablekuma Warehouse",
  locationSlug: "ablekuma",
  onHandQuantity: 10,
  productName: "Rice",
  productSlug: "rice",
  reservedQuantity: 2,
  sku: "RICE-5KG",
  skuId: "11111111-1111-4111-8111-111111111111",
  updatedAt: "2026-01-01T00:00:00.000Z",
  variantName: "5kg",
  variantSlug: "5kg",
} satisfies AdminStockBalanceSummary;

const validValues = {
  note: "  counted during close  ",
  quantity: "12",
  reasonCode: "correction",
  sku: "RICE-5KG",
} satisfies StockCountFormValues;

test("stock count defaults existing rows to the current on-hand quantity", () => {
  assert.equal(createStockCountFormDefaults(row).quantity, "10");
  assert.equal(createStockCountFormDefaults(null).quantity, "");
  assert.equal(createStockCountFormDefaults(null).reasonCode, "cycle_count");
});

test("stock count quantities must be non-negative whole numbers", () => {
  assert.equal(validateStockCountQuantity("0"), undefined);
  assert.equal(validateStockCountQuantity("12"), undefined);
  assert.equal(
    validateStockCountQuantity("-1"),
    "Quantity must be a whole number.",
  );
  assert.equal(
    validateStockCountQuantity("1.5"),
    "Quantity must be a whole number.",
  );
  assert.equal(
    validateStockCountQuantity(""),
    "Enter the physical on-hand quantity.",
  );
});

test("stock count payload includes reason code and trimmed optional note", () => {
  assert.deepEqual(
    buildStockCountRequest({
      locationSlug: "ablekuma",
      row,
      values: validValues,
    }),
    {
      locationSlug: "ablekuma",
      note: "counted during close",
      onHandQuantity: 12,
      reasonCode: "correction",
      sku: "RICE-5KG",
    },
  );
});

test("fresh counts use direct SKU entry instead of a paged product select", () => {
  assert.equal(validateStockCountSku("RICE-5KG"), undefined);
  assert.equal(validateStockCountSku(" "), "Enter or scan the SKU.");
});

test("stock count payload omits blank notes for fresh counts", () => {
  assert.deepEqual(
    buildStockCountRequest({
      locationSlug: "ablekuma",
      row: null,
      values: { ...validValues, note: " " },
    }),
    {
      locationSlug: "ablekuma",
      note: undefined,
      onHandQuantity: 12,
      reasonCode: "correction",
      sku: "RICE-5KG",
    },
  );
});

test("opening count is not available from the normal count form", () => {
  assert.equal(canUseOpeningCount({ row: null }), false);
  assert.equal(canUseOpeningCount({ row }), false);
});
