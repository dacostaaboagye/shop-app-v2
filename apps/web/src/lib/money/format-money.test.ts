import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney, toNumericAmount } from "./format-money";

test("formats raw amounts with the official currency profile", () => {
  assert.equal(
    formatMoney("24", {
      currencyCode: "GHS",
      currencyScale: 2,
      locale: "en-GH",
    }),
    "GHS 24.00",
  );
  assert.equal(
    formatMoney(24.5, {
      currencyCode: "USD",
      currencyScale: 2,
      locale: "en-US",
    }),
    "USD 24.50",
  );
});

test("preserves values that already include a currency marker", () => {
  assert.equal(formatMoney("GHS 24.00"), "GHS 24.00");
});

test("parses numeric amounts without treating invalid values as zero", () => {
  assert.equal(toNumericAmount("1,200.50"), 1200.5);
  assert.equal(toNumericAmount("not-a-number"), null);
});
