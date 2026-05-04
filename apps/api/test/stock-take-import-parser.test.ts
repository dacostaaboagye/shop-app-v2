import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStockTakeImportCsv } from "../src/modules/stock/stock-take-import-parser.js";

describe("stock take import parser", () => {
  it("parses valid stock-take rows with quoted cells", () => {
    const result = parseStockTakeImportCsv(
      'lineNumber,sku,countedQuantity,notes\n1,RICE-5KG,12,"front, shelf"',
    );

    assert.equal(result.errors.length, 0);
    assert.deepEqual(result.rows[0], {
      countedQuantity: 12,
      lineNumber: 1,
      note: "front, shelf",
      rowNumber: 2,
      sku: "RICE-5KG",
    });
  });

  it("rejects missing required headers", () => {
    const result = parseStockTakeImportCsv("sku,countedQuantity\nRICE-5KG,12");

    assert.equal(result.errors[0]?.code, "missing_required");
    assert.equal(result.errors[0]?.field, "lineNumber");
  });

  it("rejects missing, decimal, negative, and text quantities", () => {
    const result = parseStockTakeImportCsv(
      [
        "lineNumber,sku,countedQuantity",
        "1,RICE-5KG,",
        "2,OIL-1L,1.5",
        "3,SOAP,-1",
        "4,SALT,abc",
      ].join("\n"),
    );

    assert.equal(result.errors.length, 4);
    assert.deepEqual(
      result.errors.map((error) => error.code),
      [
        "missing_required",
        "invalid_quantity",
        "invalid_quantity",
        "invalid_quantity",
      ],
    );
  });

  it("keeps zero as a valid counted quantity", () => {
    const result = parseStockTakeImportCsv(
      "lineNumber,sku,countedQuantity\n1,RICE-5KG,0",
    );

    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0]?.countedQuantity, 0);
  });

  it("returns a malformed CSV error for unclosed quotes", () => {
    const result = parseStockTakeImportCsv(
      'lineNumber,sku,countedQuantity\n1,"RICE-5KG,12',
    );

    assert.equal(result.errors[0]?.code, "malformed_csv");
  });
});
