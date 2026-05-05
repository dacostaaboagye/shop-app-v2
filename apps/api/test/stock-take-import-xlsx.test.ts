import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  StockTakeApplyResponse,
  StockTakeSessionDetail,
} from "@shop/contracts";
import ExcelJS from "exceljs";
import { StockTakeApplyService } from "../src/modules/stock/stock-take-apply.service.js";
import { StockTakeImportService } from "../src/modules/stock/stock-take-import.service.js";
import { parseStockTakeImportXlsx } from "../src/modules/stock/stock-take-import-xlsx.js";
import { toStockTakeXlsxFile } from "../src/modules/stock/stock-take-xlsx.js";

describe("stock take XLSX import", () => {
  it("normalizes an edited generated workbook into import rows", async () => {
    const workbookBase64 = await buildWorkbookBase64([
      { counted: 12, note: "front shelf" },
      { counted: 3, note: "" },
    ]);

    const result = await parseStockTakeImportXlsx(workbookBase64);

    assert.equal(result.errors.length, 0);
    assert.deepEqual(result.rows[0], {
      countedQuantity: 12,
      lineNumber: 1,
      note: "front shelf",
      rowNumber: 10,
      sku: "RICE-5KG",
    });
    assert.equal(result.rows[1]?.countedQuantity, 3);
  });

  it("returns row errors for workbook counts that are missing", async () => {
    const workbookBase64 = await buildWorkbookBase64([
      { counted: null, note: "" },
      { counted: 3, note: "" },
    ]);

    const result = await parseStockTakeImportXlsx(workbookBase64);

    assert.equal(result.errors[0]?.code, "missing_required");
    assert.equal(result.errors[0]?.field, "countedQuantity");
    assert.equal(result.errors[0]?.rowNumber, 10);
  });

  it("rejects workbooks that do not contain the generated stock-take sheet", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Other Sheet").getCell("A1").value = "not stock";
    const buffer = await workbook.xlsx.writeBuffer();

    const result = await parseStockTakeImportXlsx(
      Buffer.from(buffer).toString("base64"),
    );

    assert.equal(result.errors[0]?.code, "malformed_csv");
    assert.match(result.errors[0]?.message ?? "", /header row/);
  });

  it("rejects sparse workbooks with unsafe row counts", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Stock Take");
    worksheet.addRow(["Line #", "SKU", "Counted quantity"]);
    worksheet.getRow(20_001).getCell(1).value = "too far";
    const buffer = await workbook.xlsx.writeBuffer();

    const result = await parseStockTakeImportXlsx(
      Buffer.from(buffer).toString("base64"),
    );

    assert.equal(result.errors[0]?.code, "malformed_csv");
    assert.match(result.errors[0]?.message ?? "", /too many rows/);
  });

  it("dry-runs workbook uploads through the same validation path as CSV", async () => {
    const service = new StockTakeImportService({
      async getSnapshot() {
        return generatedSnapshot;
      },
    });

    const result = await service.dryRun({
      reference: "STKTAKE-2026-0001",
      request: {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "stock-take.xlsx",
        workbookBase64: await buildWorkbookBase64([
          { counted: 12, note: "front shelf" },
          { counted: 3, note: "" },
        ]),
      },
    });

    assert.equal(result.canApply, true);
    assert.equal(result.rows[0]?.variance, 2);
    assert.equal(result.summary.totalPositiveVariance, 2);
  });

  it("revalidates reviewed workbook uploads before apply", async () => {
    const state = { rowCount: 0 };
    const service = new StockTakeApplyService(
      {
        async apply(input) {
          state.rowCount = input.rows.length;
          return applyResponse();
        },
      },
      {
        async getSnapshot() {
          return generatedSnapshot;
        },
      },
    );

    const result = await service.apply({
      reference: "STKTAKE-2026-0001",
      request: {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "stock-take.xlsx",
        reviewed: true,
        workbookBase64: await buildWorkbookBase64([
          { counted: 12, note: "front shelf" },
          { counted: 3, note: "" },
        ]),
      },
    });

    assert.equal(result.status, "applied");
    assert.equal(state.rowCount, 2);
  });
});

async function buildWorkbookBase64(
  rows: Array<{ counted: number | null; note: string }>,
) {
  const file = await toStockTakeXlsxFile(sessionDetail());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toLoadableBuffer(file.body));
  const worksheet = workbook.getWorksheet("Stock Take");
  assert.ok(worksheet);

  rows.forEach((row, index) => {
    const worksheetRow = worksheet.getRow(index + 10);
    worksheetRow.getCell(6).value = row.counted;
    worksheetRow.getCell(7).value = row.note;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

function sessionDetail(): StockTakeSessionDetail {
  return {
    appliedAt: null,
    appliedByUserSlug: null,
    blankSheet: false,
    bookletPdfUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/booklet.pdf",
    generatedAt: "2026-05-04T10:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: 2,
    lines: [
      line({ lineNumber: 1, sku: "RICE-5KG", systemOnHand: 10 }),
      line({ lineNumber: 2, sku: "OIL-1L", systemOnHand: 3 }),
    ],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode: "assisted",
    printableBookletUrl: "/manager/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
    varianceReportPdfUrl: null,
  };
}

function line(input: {
  lineNumber: number;
  sku: string;
  systemOnHand: number;
}) {
  return {
    appliedDelta: null,
    availableQuantity: input.systemOnHand,
    countedQuantity: null,
    lineNumber: input.lineNumber,
    note: null,
    productName: input.sku === "RICE-5KG" ? "Rice" : "Oil",
    productSlug: input.sku === "RICE-5KG" ? "rice" : "oil",
    reservedQuantity: 0,
    rowStatus: "catalog_sku" as const,
    sku: input.sku,
    systemOnHand: input.systemOnHand,
    unitOfMeasure: "unit",
    variance: null,
    variantName: input.sku === "RICE-5KG" ? "5kg" : "1L",
    variantSlug: input.sku === "RICE-5KG" ? "5kg" : "1l",
  };
}

const generatedSnapshot = {
  lines: [
    {
      availableQuantity: 8,
      expectedOnHand: 10,
      lineNumber: 1,
      mode: "assisted" as const,
      productName: "Rice",
      reservedQuantity: 2,
      rowStatus: "catalog_sku" as const,
      sku: "RICE-5KG",
      systemOnHand: 10,
      variantName: "5kg",
    },
    {
      availableQuantity: 3,
      expectedOnHand: 3,
      lineNumber: 2,
      mode: "assisted" as const,
      productName: "Oil",
      reservedQuantity: 0,
      rowStatus: "catalog_sku" as const,
      sku: "OIL-1L",
      systemOnHand: 3,
      variantName: "1L",
    },
  ],
  session: {
    generatedAt: new Date("2026-05-04T10:00:00.000Z"),
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode: "assisted" as const,
    reference: "STKTAKE-2026-0001",
    status: "generated" as const,
  },
};

function applyResponse(): StockTakeApplyResponse {
  return {
    appliedAt: "2026-05-04T10:10:00.000Z",
    appliedByUserSlug: "manager",
    lines: [],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    status: "applied",
    stockTakeReference: "STKTAKE-2026-0001",
    summary: {
      appliedRows: 0,
      changedRows: 0,
      noChangeRows: 0,
      totalNegativeDelta: 0,
      totalPositiveDelta: 0,
    },
  };
}

function toLoadableBuffer(
  buffer: Buffer,
): Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0] {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
}
