import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeSessionDetail } from "@shop/contracts";
import ExcelJS from "exceljs";
import { toStockTakeXlsxFile } from "../src/modules/stock/stock-take-xlsx.js";

describe("stock take XLSX workbook", () => {
  it("builds a protected blind workbook with editable count fields", async () => {
    const file = await toStockTakeXlsxFile(createSession("blind"));
    const worksheet = await readWorksheet(file.body);

    assert.equal(file.filename, "STKTAKE-2026-0001-sheet.xlsx");
    assert.equal(worksheet.getCell("A1").value, "Stock-take workbook");
    assert.equal(worksheet.getCell("B2").value, "STKTAKE-2026-0001");
    assert.equal(worksheet.getCell("A9").value, "lineNumber");
    assert.equal(worksheet.getCell("F9").value, "countedQuantity");
    assert.equal(worksheet.getCell("G9").value, "notes");
    assert.equal(worksheet.getCell("H9").value, null);
    assert.equal(worksheet.getCell("B10").value, "Rice");
    assert.notEqual(worksheet.getCell("A10").protection?.locked, false);
    assert.equal(worksheet.getCell("F10").protection?.locked, false);
    assert.equal(worksheet.getCell("G10").protection?.locked, false);
  });

  it("adds assisted system quantity columns", async () => {
    const worksheet = await readWorksheet(
      (await toStockTakeXlsxFile(createSession("assisted"))).body,
    );

    assert.equal(worksheet.getCell("H9").value, "systemOnHand");
    assert.equal(worksheet.getCell("I9").value, "reservedQuantity");
    assert.equal(worksheet.getCell("J9").value, "availableQuantity");
    assert.equal(worksheet.getCell("K9").value, "variance");
    assert.equal(worksheet.getCell("H10").value, 10);
  });

  it("keeps blank manual rows printable without system columns", async () => {
    const worksheet = await readWorksheet(
      (await toStockTakeXlsxFile(createSession("assisted", true))).body,
    );

    assert.match(String(worksheet.getCell("B7").value), /No active SKUs/);
    assert.equal(worksheet.getCell("H9").value, null);
    assert.equal(worksheet.getCell("A10").value, 1);
  });

  it("neutralizes spreadsheet formulas in editable text", async () => {
    const session = createSession("blind");
    const firstLine = session.lines[0];
    assert.ok(firstLine);
    session.lines[0] = {
      ...firstLine,
      note: "@review",
      productName: "=Rice",
      sku: "+RICE-5KG",
    };
    const worksheet = await readWorksheet(
      (await toStockTakeXlsxFile(session)).body,
    );

    assert.equal(worksheet.getCell("B10").value, "'=Rice");
    assert.equal(worksheet.getCell("D10").value, "'+RICE-5KG");
    assert.equal(worksheet.getCell("G10").value, "'@review");
  });
});

async function readWorksheet(body: Uint8Array): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = new ArrayBuffer(body.byteLength);
  new Uint8Array(arrayBuffer).set(body);
  await workbook.xlsx.load(
    arrayBuffer as Parameters<typeof workbook.xlsx.load>[0],
  );
  const worksheet = workbook.getWorksheet("Stock Take");
  assert.ok(worksheet);
  return worksheet;
}

function createSession(
  mode: "blind" | "assisted",
  blankSheet = false,
): StockTakeSessionDetail {
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
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode,
    printableBookletUrl: "/manager/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
    varianceReportPdfUrl: null,
  };
}
