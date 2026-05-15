import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeDetailResponse } from "@/lib/react-query/stock-takes";
import {
  buildInAppCountsCsvRequest,
  getInAppCountsFileName,
  getInAppCountsFileSignature,
} from "./stock-take-in-app-counts.support";

describe("stock-take-in-app-counts.support", () => {
  it("emits a csv with header and one row per line, in line-number order", () => {
    const request = buildInAppCountsCsvRequest(
      buildDetail([
        { countedQuantity: 5, lineNumber: 1, note: null, sku: "A-1" },
        { countedQuantity: 3, lineNumber: 2, note: "back shelf", sku: "B-1" },
      ]),
    );

    assert.equal(request.contentType, "text/csv");
    assert.equal(request.fileName, "STK-1-in-app-counts.csv");
    assert.ok("csv" in request);
    const lines = request.csv.split("\n");
    assert.equal(lines[0], "lineNumber,sku,countedQuantity,notes");
    assert.equal(lines[1], "1,A-1,5,");
    assert.equal(lines[2], "2,B-1,3,back shelf");
  });

  it("renders missing counted quantities as empty cells, not zero", () => {
    const request = buildInAppCountsCsvRequest(
      buildDetail([
        { countedQuantity: null, lineNumber: 1, note: null, sku: "A-1" },
      ]),
    );

    assert.ok("csv" in request);
    const lines = request.csv.split("\n");
    assert.equal(lines[1], "1,A-1,,");
  });

  it("escapes notes with commas, quotes, or newlines", () => {
    const request = buildInAppCountsCsvRequest(
      buildDetail([
        {
          countedQuantity: 2,
          lineNumber: 1,
          note: 'broken "lid", see photo',
          sku: "A-1",
        },
      ]),
    );

    assert.ok("csv" in request);
    const lines = request.csv.split("\n");
    assert.equal(lines[1], '1,A-1,2,"broken ""lid"", see photo"');
  });

  it("returns a stable file signature scoped to the stock-take reference", () => {
    assert.equal(getInAppCountsFileSignature("STK-1"), "in-app:STK-1");
    assert.equal(getInAppCountsFileSignature("STK-2"), "in-app:STK-2");
    assert.notEqual(
      getInAppCountsFileSignature("STK-1"),
      getInAppCountsFileSignature("STK-2"),
    );
  });

  it("derives a deterministic file name from the stock-take reference", () => {
    assert.equal(getInAppCountsFileName("STK-1"), "STK-1-in-app-counts.csv");
  });
});

type LineSeed = {
  countedQuantity: number | null;
  lineNumber: number;
  note: string | null;
  sku: string;
};

function buildDetail(lines: LineSeed[]): StockTakeDetailResponse {
  return {
    appliedAt: null,
    appliedByUserSlug: null,
    blankSheet: false,
    bookletPdfUrl: "/api/admin/stock-takes/STK-1/booklet.pdf",
    generatedAt: "2026-05-04T09:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: lines.length,
    lines: lines.map((line) => ({
      appliedDelta: null,
      availableQuantity: null,
      countedQuantity: line.countedQuantity,
      lineNumber: line.lineNumber,
      note: line.note,
      productName: "P",
      productSlug: "p",
      reservedQuantity: null,
      rowStatus: "catalog_sku",
      sku: line.sku,
      systemOnHand: null,
      unitOfMeasure: "bag",
      variance: null,
      variantName: "V",
      variantSlug: "v",
    })),
    locationName: "Central Shop",
    locationSlug: "central-shop",
    mode: "blind",
    printableBookletUrl: "/admin/stock/takes/STK-1/booklet",
    sheetCsvUrl: "/api/admin/stock-takes/STK-1/sheet.csv",
    sheetXlsxUrl: "/api/admin/stock-takes/STK-1/sheet.xlsx",
    status: "generated",
    stockTakeReference: "STK-1",
    varianceReportPdfUrl: null,
  };
}
