import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stockTakeCreateRequestSchema,
  stockTakeSessionDetailSchema,
} from "./stock-takes.js";

describe("stock take contracts", () => {
  it("defaults stock-take creation to blind count mode", () => {
    const request = stockTakeCreateRequestSchema.parse({
      locationSlug: "downtown-store",
    });

    assert.equal(request.mode, "blind");
  });

  it("keeps public session details free of internal identifiers", () => {
    const detail = stockTakeSessionDetailSchema.parse({
      blankSheet: false,
      generatedAt: "2026-05-04T10:00:00.000Z",
      generatedByUserSlug: "manager",
      lineCount: 1,
      lines: [
        {
          availableQuantity: 8,
          barcode: "12345",
          countedQuantity: null,
          lineNumber: 1,
          note: null,
          productName: "Rice",
          productSlug: "rice",
          reservedQuantity: 2,
          rowStatus: "catalog_sku",
          sku: "RICE-5KG",
          systemOnHand: 10,
          unitOfMeasure: "bag",
          variance: null,
          variantName: "5kg",
          variantSlug: "rice-5kg",
        },
      ],
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
      mode: "assisted",
      printableBookletUrl: "/manager/stock/takes/STKTAKE-00001/booklet",
      sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-00001/sheet.csv",
      status: "generated",
      stockTakeReference: "STKTAKE-00001",
    });

    assert.equal("id" in detail, false);
    assert.equal("locationId" in detail, false);
    const firstLine = detail.lines[0];
    assert.ok(firstLine);
    assert.equal("skuId" in firstLine, false);
  });

  it("allows blind session details to mask system quantities", () => {
    const detail = stockTakeSessionDetailSchema.parse({
      blankSheet: false,
      generatedAt: "2026-05-04T10:00:00.000Z",
      generatedByUserSlug: "manager",
      lineCount: 1,
      lines: [
        {
          availableQuantity: null,
          barcode: "12345",
          countedQuantity: null,
          lineNumber: 1,
          note: null,
          productName: "Rice",
          productSlug: "rice",
          reservedQuantity: null,
          rowStatus: "catalog_sku",
          sku: "RICE-5KG",
          systemOnHand: null,
          unitOfMeasure: "bag",
          variance: null,
          variantName: "5kg",
          variantSlug: "rice-5kg",
        },
      ],
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
      mode: "blind",
      printableBookletUrl: "/manager/stock/takes/STKTAKE-00001/booklet",
      sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-00001/sheet.csv",
      status: "generated",
      stockTakeReference: "STKTAKE-00001",
    });

    assert.equal(detail.lines[0]?.systemOnHand, null);
    assert.equal(detail.lines[0]?.reservedQuantity, null);
    assert.equal(detail.lines[0]?.availableQuantity, null);
  });
});
