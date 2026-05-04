import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findApplyConflicts } from "../src/modules/stock/stock-take-apply.repository-support.js";

describe("stock take apply repository support", () => {
  it("reports reserved quantity and stock drift conflicts with CSV row numbers", () => {
    const conflicts = findApplyConflicts({
      applyRowBySku: new Map([
        [
          "rice-5kg",
          {
            countedQuantity: 1,
            lineNumber: 1,
            note: null,
            rowNumber: 8,
            sku: "RICE-5KG",
          },
        ],
        [
          "oil-1l",
          {
            countedQuantity: 5,
            lineNumber: 2,
            note: null,
            rowNumber: 9,
            sku: "OIL-1L",
          },
        ],
      ]),
      balanceBySkuId: new Map([
        ["sku-rice", { onHandQuantity: 10, reservedQuantity: 2 }],
        ["sku-oil", { onHandQuantity: 4, reservedQuantity: 0 }],
      ]),
      lines: [
        {
          expectedOnHand: 10,
          lineNumber: 1,
          productName: "Rice",
          rowStatus: "catalog_sku",
          sku: "RICE-5KG",
          skuId: "sku-rice",
          variantName: "5kg",
        },
        {
          expectedOnHand: 3,
          lineNumber: 2,
          productName: "Oil",
          rowStatus: "catalog_sku",
          sku: "OIL-1L",
          skuId: "sku-oil",
          variantName: "1L",
        },
      ],
    });

    assert.equal(conflicts[0]?.code, "reserved_conflict");
    assert.equal(conflicts[0]?.rowNumber, 8);
    assert.equal(conflicts[1]?.code, "system_drift");
    assert.equal(conflicts[1]?.rowNumber, 9);
  });
});
