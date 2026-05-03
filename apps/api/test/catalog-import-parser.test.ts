import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCatalogImportCsv,
  parseCatalogImportOriginalRows,
} from "../src/modules/catalog/catalog-import-parser.js";

const header =
  "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice,categorySlug,brandSlug,barcode,status,description,countryOfOrigin,isTaxable,priceIncludesTax,taxCategory,attributesJson,weightGrams,packagingType,manufacturerPartNumber,customsCode";

describe("parseCatalogImportCsv", () => {
  it("normalizes clean one-row-per-variant CSV input", () => {
    const csv = [
      header,
      'Training Shoe,Black / 42, SHOE-BLK-42 ,each,10,15.5,footwear,nike,12345,active,"Road shoe",gh,true,false,standard,"{""color"":""black""}",500,box,MPN-1,6404',
      'Training Shoe,White / 42,SHOE-WHT-42,each,11.00,16.00,footwear,nike,,archived,,GH,yes,no,standard,"{""color"":""white""}",450,box,,',
    ].join("\n");

    const result = parseCatalogImportCsv(csv);

    assert.equal(result.errors.length, 0);
    assert.equal(result.summary.validRows, 2);
    assert.deepEqual(result.validRows[0], {
      attributes: { color: "black" },
      barcode: "12345",
      brandSlug: "nike",
      categorySlug: "footwear",
      costPrice: "10.00",
      countryOfOrigin: "GH",
      customsCode: "6404",
      description: "Road shoe",
      isTaxable: true,
      manufacturerPartNumber: "MPN-1",
      packagingType: "box",
      priceIncludesTax: false,
      productName: "Training Shoe",
      rowNumber: 2,
      sellingPrice: "15.50",
      sku: "SHOE-BLK-42",
      status: "active",
      taxCategory: "standard",
      unitOfMeasure: "each",
      variantName: "Black / 42",
      weightGrams: 500,
    });
    assert.equal(result.validRows[1]?.status, "archived");
  });

  it("reports row-level validation errors and keeps valid rows", () => {
    const csv = [
      header,
      'Clean Product,Default,CLEAN-1,each,1.00,2.00,,,,,,,,,,"{""size"":""m""}",,,,',
      'Missing SKU,Default,,each,1.00,2.00,,,,,,,,,,"{""size"":""m""}",,,,',
      'Bad Money,Default,BAD-MONEY,each,-1,2.345,,,,,,,,,,"{""size"":""m""}",,,,',
      'Bad Status,Default,BAD-STATUS,each,1.00,2.00,,,,draft,,,,,,"{""size"":""m""}",,,,',
      "Bad Json,Default,BAD-JSON,each,1.00,2.00,,,,,,,,,,{bad-json},,,,",
    ].join("\n");

    const result = parseCatalogImportCsv(csv);
    const codes = result.errors.map((error) => error.code).sort();

    assert.deepEqual(codes, [
      "invalid_money",
      "invalid_money",
      "invalid_status",
      "malformed_json",
      "missing_required",
    ]);
    assert.equal(result.summary.validRows, 1);
    assert.equal(result.summary.invalidRows, 4);
    assert.equal(result.validRows[0]?.sku, "CLEAN-1");
  });

  it("detects duplicate SKUs and duplicate barcodes inside the file", () => {
    const csv = [
      header,
      "Product,One,DUP-1,each,1.00,2.00,,,BAR-1,,,,,,,,,,,",
      "Product,Two,dup-1,each,1.00,2.00,,,BAR-2,,,,,,,,,,,",
      "Product,Three,OK-1,each,1.00,2.00,,,bar-1,,,,,,,,,,,",
    ].join("\n");

    const result = parseCatalogImportCsv(csv);

    assert.deepEqual(
      result.errors.map((error) => [error.rowNumber, error.code]),
      [
        [3, "duplicate_sku"],
        [4, "duplicate_barcode"],
      ],
    );
    assert.equal(result.validRows.length, 1);
  });

  it("returns safe malformed CSV errors", () => {
    const result = parseCatalogImportCsv(`${header}\n"Product,Variant`);

    assert.deepEqual(result.errors, [
      {
        code: "malformed_csv",
        message: "CSV content is malformed.",
        rowNumber: 2,
      },
    ]);
    assert.equal(result.validRows.length, 0);
  });

  it("caps parsed rows and reports the limit", () => {
    const csv = [
      "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
      "Product,One,SKU-1,each,1.00,2.00",
      "Product,Two,SKU-2,each,1.00,2.00",
    ].join("\n");

    const result = parseCatalogImportCsv(csv, { maxRows: 1 });

    assert.equal(result.summary.totalRows, 2);
    assert.equal(result.summary.truncated, true);
    assert.equal(result.validRows.length, 1);
    assert.equal(result.errors[0]?.code, "row_limit_exceeded");
  });

  it("reports missing required headers", () => {
    const result = parseCatalogImportCsv(
      "productName,variantName,sku\nProduct,Default,SKU-1",
    );

    assert.deepEqual(
      result.errors.map((error) => error.field),
      ["unitOfMeasure", "costPrice", "sellingPrice"],
    );
  });

  it("maps original rows through the CSV parser instead of naive comma splitting", () => {
    const rows = parseCatalogImportOriginalRows(
      [
        "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice,description",
        'Training Shoe,Black,SKU-1,each,1.00,2.00,"Road, trail"',
      ].join("\n"),
    );

    assert.equal(rows.get(2)?.description, "Road, trail");
  });
});
