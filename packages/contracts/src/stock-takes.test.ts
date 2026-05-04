import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stockTakeApplyRequestSchema,
  stockTakeApplyResponseSchema,
  stockTakeCreateRequestSchema,
  stockTakeImportDryRunRequestSchema,
  stockTakeImportDryRunResponseSchema,
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
      appliedAt: null,
      appliedByUserSlug: null,
      blankSheet: false,
      bookletPdfUrl: "/api/manager/stock-takes/STKTAKE-00001/booklet.pdf",
      generatedAt: "2026-05-04T10:00:00.000Z",
      generatedByUserSlug: "manager",
      lineCount: 1,
      lines: [
        {
          appliedDelta: null,
          availableQuantity: 8,
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
      varianceReportPdfUrl: null,
    });

    assert.equal("id" in detail, false);
    assert.equal("locationId" in detail, false);
    const firstLine = detail.lines[0];
    assert.ok(firstLine);
    assert.equal("barcode" in firstLine, false);
    assert.equal("skuId" in firstLine, false);
  });

  it("allows blind session details to mask system quantities", () => {
    const detail = stockTakeSessionDetailSchema.parse({
      appliedAt: null,
      appliedByUserSlug: null,
      blankSheet: false,
      bookletPdfUrl: "/api/manager/stock-takes/STKTAKE-00001/booklet.pdf",
      generatedAt: "2026-05-04T10:00:00.000Z",
      generatedByUserSlug: "manager",
      lineCount: 1,
      lines: [
        {
          appliedDelta: null,
          availableQuantity: null,
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
      varianceReportPdfUrl: null,
    });

    assert.equal(detail.lines[0]?.systemOnHand, null);
    assert.equal(detail.lines[0]?.reservedQuantity, null);
    assert.equal(detail.lines[0]?.availableQuantity, null);
  });

  it("accepts stock-take dry-run upload requests", () => {
    const request = stockTakeImportDryRunRequestSchema.parse({
      contentType: "text/csv",
      csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
      fileName: "STKTAKE-2026-0001.csv",
    });

    assert.equal(request.fileName, "STKTAKE-2026-0001.csv");
  });

  it("requires reviewed confirmation for stock-take apply requests", () => {
    const request = stockTakeApplyRequestSchema.parse({
      contentType: "text/csv",
      csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
      fileName: "STKTAKE-2026-0001.csv",
      reviewed: true,
    });

    assert.equal(request.reviewed, true);
  });

  it("keeps stock-take dry-run responses free of internal identifiers", () => {
    const response = stockTakeImportDryRunResponseSchema.parse({
      canApply: true,
      errors: [],
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
      rows: [
        {
          availableQuantity: 10,
          countedQuantity: 12,
          lineNumber: 1,
          note: "front shelf",
          productName: "Rice",
          reservedQuantity: 2,
          rowNumber: 2,
          sku: "RICE-5KG",
          status: "valid",
          systemOnHand: 10,
          variance: 2,
          variantName: "5kg",
        },
      ],
      status: "generated",
      stockTakeReference: "STKTAKE-2026-0001",
      summary: {
        duplicateRows: 0,
        invalidRows: 0,
        totalNegativeVariance: 0,
        totalPositiveVariance: 2,
        totalRows: 1,
        unknownRows: 0,
        validRows: 1,
        varianceRows: 1,
      },
    });

    assert.equal("id" in response, false);
    assert.equal("locationId" in response, false);
    const firstRow = response.rows[0];
    assert.ok(firstRow);
    assert.equal("skuId" in firstRow, false);
  });

  it("keeps stock-take apply responses free of internal identifiers", () => {
    const response = stockTakeApplyResponseSchema.parse({
      appliedAt: "2026-05-04T10:05:00.000Z",
      appliedByUserSlug: "manager",
      lines: [
        {
          countedQuantity: 12,
          lineNumber: 1,
          movementCreated: true,
          previousOnHandQuantity: 10,
          productName: "Rice",
          quantityDelta: 2,
          sku: "RICE-5KG",
          status: "changed",
          variantName: "5kg",
        },
      ],
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
      status: "applied",
      stockTakeReference: "STKTAKE-2026-0001",
      summary: {
        appliedRows: 1,
        changedRows: 1,
        noChangeRows: 0,
        totalNegativeDelta: 0,
        totalPositiveDelta: 2,
      },
    });

    assert.equal("id" in response, false);
    assert.equal("locationId" in response, false);
    const firstLine = response.lines[0];
    assert.ok(firstLine);
    assert.equal("skuId" in firstLine, false);
  });
});
