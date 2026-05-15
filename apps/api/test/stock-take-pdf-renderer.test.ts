import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeSessionDetail } from "@shop/contracts";
import { renderStockTakeBookletPdf } from "../src/modules/stock/stock-take-pdf-renderer.js";

describe("stock take PDF renderer", () => {
  it("includes expected quantity columns for assisted booklets", () => {
    const doc = new FakePdfDocument();

    renderStockTakeBookletPdf(doc.asPdfDocument(), buildSession("assisted"));

    assert.ok(doc.texts.includes("Expected"));
    assert.ok(doc.texts.includes("10"));
  });

  it("omits expected quantity columns for blind booklets", () => {
    const doc = new FakePdfDocument();

    renderStockTakeBookletPdf(doc.asPdfDocument(), buildSession("blind"));

    assert.equal(doc.texts.includes("Expected"), false);
  });

  it("prints controlled instructions for blank booklets", () => {
    const doc = new FakePdfDocument();

    renderStockTakeBookletPdf(doc.asPdfDocument(), buildSession("blind", true));

    assert.ok(
      doc.texts.some((value) => value.includes("No active SKUs were found")),
    );
  });
});

class FakePdfDocument {
  readonly texts: string[] = [];
  readonly page = { height: 842, width: 595 };
  y = 220;

  addPage(): this {
    return this;
  }

  asPdfDocument(): PDFKit.PDFDocument {
    return this as unknown as PDFKit.PDFDocument;
  }

  fill(): this {
    return this;
  }

  fillColor(): this {
    return this;
  }

  font(): this {
    return this;
  }

  fontSize(): this {
    return this;
  }

  lineTo(): this {
    return this;
  }

  moveTo(): this {
    return this;
  }

  rect(): this {
    return this;
  }

  roundedRect(): this {
    return this;
  }

  stroke(): this {
    return this;
  }

  strokeColor(): this {
    return this;
  }

  text(value: string): this {
    this.texts.push(value);
    return this;
  }
}

function buildSession(
  mode: StockTakeSessionDetail["mode"],
  blankSheet = false,
): StockTakeSessionDetail {
  return {
    appliedAt: null,
    appliedByUserSlug: null,
    blankSheet,
    bookletPdfUrl: "/api/manager/stock-takes/STK-2026-0001/booklet.pdf",
    generatedAt: "2026-05-04T10:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: 1,
    lines: [
      {
        appliedDelta: null,
        availableQuantity: blankSheet ? 0 : 8,
        countedQuantity: null,
        lineNumber: 1,
        note: null,
        productName: blankSheet ? "" : "Rice",
        productSlug: blankSheet ? null : "rice",
        reservedQuantity: blankSheet ? 0 : 2,
        rowStatus: blankSheet ? "manual_blank" : "catalog_sku",
        sku: blankSheet ? "" : "RICE-5KG",
        systemOnHand: blankSheet ? 0 : 10,
        unitOfMeasure: blankSheet ? "" : "bag",
        variance: null,
        variantName: blankSheet ? "" : "5kg",
        variantSlug: blankSheet ? null : "rice-5kg",
      },
    ],
    locationName: "Central Shop",
    locationSlug: "central-shop",
    mode,
    printableBookletUrl: "/manager/stock/takes/STK-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.xlsx",
    status: "generated",
    stockTakeReference: "STK-2026-0001",
    varianceReportPdfUrl: null,
  };
}
