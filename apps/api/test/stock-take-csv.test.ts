import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeSessionDetail } from "@shop/contracts";
import { buildStockTakeCsv } from "../src/modules/stock/stock-take-csv.js";

describe("stock take CSV", () => {
  it("omits system quantities for blind counts", () => {
    const csv = buildStockTakeCsv(createSession({ mode: "blind" }));

    assert.equal(
      firstLine(csv),
      "lineNumber,productName,variantName,sku,barcode,unitOfMeasure,countedQuantity,notes",
    );
    assert.doesNotMatch(csv, /systemOnHand/);
  });

  it("includes system quantities for assisted counts", () => {
    const csv = buildStockTakeCsv(createSession({ mode: "assisted" }));

    assert.equal(
      firstLine(csv),
      "lineNumber,productName,variantName,sku,barcode,unitOfMeasure,countedQuantity,notes,systemOnHand,reservedQuantity,availableQuantity,variance",
    );
    assert.match(csv, /10,2,8/);
  });

  it("uses manual columns for blank sheets", () => {
    const csv = buildStockTakeCsv(createSession({ blankSheet: true }));

    assert.equal(
      firstLine(csv),
      "lineNumber,productName,variantName,sku,unitOfMeasure,countedQuantity,notes",
    );
    assert.match(csv, /^1,,,,,,/m);
  });

  it("neutralizes spreadsheet formulas in exported text cells", () => {
    const csv = buildStockTakeCsv(
      createSession({
        lineOverride: {
          barcode: "@barcode",
          note: "-note",
          productName: "=cmd",
          sku: "+sku",
          variantName: "\t=variant",
        },
      }),
    );

    assert.match(csv, /,'=cmd,/);
    assert.match(csv, /'\+sku/);
    assert.match(csv, /'@barcode/);
    assert.match(csv, /'-note/);
    assert.match(csv, /'\t=variant/);
  });
});

function createSession(input: {
  blankSheet?: boolean;
  lineOverride?: Partial<StockTakeSessionDetail["lines"][number]>;
  mode?: "blind" | "assisted";
}): StockTakeSessionDetail {
  const blankSheet = input.blankSheet ?? false;
  return {
    appliedAt: null,
    appliedByUserSlug: null,
    blankSheet,
    bookletPdfUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/booklet.pdf",
    generatedAt: "2026-05-04T10:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: 1,
    lines: [
      {
        appliedDelta: null,
        availableQuantity: blankSheet ? 0 : 8,
        barcode: blankSheet ? null : "12345",
        countedQuantity: null,
        lineNumber: 1,
        note: null,
        productName: blankSheet ? "" : "Rice, premium",
        productSlug: blankSheet ? null : "rice",
        reservedQuantity: blankSheet ? 0 : 2,
        rowStatus: blankSheet ? "manual_blank" : "catalog_sku",
        sku: blankSheet ? "" : "RICE-5KG",
        systemOnHand: blankSheet ? 0 : 10,
        unitOfMeasure: blankSheet ? "" : "bag",
        variance: null,
        variantName: blankSheet ? "" : "5kg",
        variantSlug: blankSheet ? null : "rice-5kg",
        ...input.lineOverride,
      },
    ],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode: input.mode ?? "blind",
    printableBookletUrl: "/manager/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.csv",
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
    varianceReportPdfUrl: null,
  };
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0] ?? "";
}
