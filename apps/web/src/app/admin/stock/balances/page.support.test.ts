import assert from "node:assert/strict";
import test from "node:test";
import {
  createStockBalanceFilter,
  hasStockBalanceFilter,
} from "./page.support";

test("admin stock filters default to global inventory visibility", () => {
  assert.deepEqual(createStockBalanceFilter(), {
    brandSlug: "",
    categorySlug: "",
    locationSlug: "",
    q: "",
  });
});

test("admin stock filters can be initialized with an explicit location", () => {
  assert.equal(
    createStockBalanceFilter("ablekuma-warehouse").locationSlug,
    "ablekuma-warehouse",
  );
});

test("detects location and catalog stock filters", () => {
  assert.equal(hasStockBalanceFilter(createStockBalanceFilter()), false);
  assert.equal(
    hasStockBalanceFilter({
      ...createStockBalanceFilter(),
      locationSlug: "ablekuma-warehouse",
    }),
    true,
  );
  assert.equal(
    hasStockBalanceFilter({
      ...createStockBalanceFilter(),
      brandSlug: "amali",
    }),
    true,
  );
});
