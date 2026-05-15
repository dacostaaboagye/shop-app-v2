import assert from "node:assert/strict";
import test from "node:test";
import {
  fromStockFilterSelectValue,
  toStockFilterSelectValue,
} from "./stock-filter-select.support";

test("stock filter select maps empty values to the All sentinel", () => {
  assert.equal(toStockFilterSelectValue(""), "all");
  assert.equal(toStockFilterSelectValue("ablekuma"), "ablekuma");
});

test("stock filter select emits an empty string when All is selected", () => {
  assert.equal(fromStockFilterSelectValue("all"), "");
  assert.equal(fromStockFilterSelectValue("ablekuma"), "ablekuma");
});
