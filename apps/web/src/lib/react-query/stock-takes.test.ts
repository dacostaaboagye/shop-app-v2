import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  applyStockTakeImport,
  createStockTakeSheet,
  downloadStockTakeBookletPdf,
  downloadStockTakeSheetCsv,
  downloadStockTakeVarianceReportPdf,
  dryRunStockTakeImport,
  fetchStockTakeDetail,
} from "./stock-takes";

afterEach(() => {
  mock.restoreAll();
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

describe("stock take helpers", () => {
  it("posts stock take sheet generation requests to the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          locationSlug: "central-shop",
          mode: "blind",
        });

        return jsonResponse({
          appliedAt: null,
          appliedByUserSlug: null,
          blankSheet: true,
          bookletPdfUrl: "/api/admin/stock-takes/STK-2026-0001/booklet.pdf",
          generatedAt: "2026-05-04T09:00:00.000Z",
          generatedByUserSlug: "admin-user",
          lineCount: 24,
          locationName: "Central Shop",
          locationSlug: "central-shop",
          mode: "blind",
          printableBookletUrl: "/admin/stock/takes/STK-2026-0001/booklet",
          sheetCsvUrl: "/api/admin/stock-takes/STK-2026-0001/sheet.csv",
          sheetXlsxUrl: "/api/admin/stock-takes/STK-2026-0001/sheet.xlsx",
          status: "generated",
          stockTakeReference: "STK-2026-0001",
          varianceReportPdfUrl: null,
        });
      },
    );

    const response = await createStockTakeSheet("admin", {
      locationSlug: "central-shop",
      mode: "blind",
    });

    assert.equal(response.stockTakeReference, "STK-2026-0001");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("fetches stock take details by public reference", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2026-0001",
        );

        return jsonResponse({
          appliedAt: null,
          appliedByUserSlug: null,
          blankSheet: false,
          bookletPdfUrl: "/api/manager/stock-takes/STK-2026-0001/booklet.pdf",
          generatedAt: "2026-05-04T09:00:00.000Z",
          generatedByUserSlug: "manager-user",
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
              unitOfMeasure: "each",
              variance: null,
              variantName: "5kg",
              variantSlug: "5kg",
            },
          ],
          locationName: "Central Shop",
          locationSlug: "central-shop",
          mode: "assisted",
          printableBookletUrl: "/manager/stock/takes/STK-2026-0001/booklet",
          sheetCsvUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.csv",
          sheetXlsxUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.xlsx",
          status: "generated",
          stockTakeReference: "STK-2026-0001",
          varianceReportPdfUrl: null,
        });
      },
    );

    const response = await fetchStockTakeDetail("manager", "STK-2026-0001");

    assert.equal(response.lines[0]?.sku, "RICE-5KG");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("downloads the generated CSV from the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/admin/stock-takes/STK-2026-0001/sheet.csv",
        );

        return new Response("sku,countedQuantity", {
          headers: {
            "content-disposition": 'attachment; filename="stock-take.csv"',
            "content-type": "text/csv",
          },
          status: 200,
        });
      },
    );

    const file = await downloadStockTakeSheetCsv("admin", "STK-2026-0001");

    assert.equal(file.name, "stock-take.csv");
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("downloads stock-take PDF files from the selected portal", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    const urls: string[] = [];
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        urls.push(String(input));

        return new Response("%PDF", {
          headers: {
            "content-disposition": 'attachment; filename="stock-take.pdf"',
            "content-type": "application/pdf",
          },
          status: 200,
        });
      },
    );

    const file = await downloadStockTakeBookletPdf("manager", "STK-2026-0001");
    const report = await downloadStockTakeVarianceReportPdf(
      "admin",
      "STK-2026-0001",
    );

    assert.deepEqual(urls, [
      "http://localhost:4000/api/manager/stock-takes/STK-2026-0001/booklet.pdf",
      "http://localhost:4000/api/admin/stock-takes/STK-2026-0001/variance-report.pdf",
    ]);
    assert.equal(file.name, "stock-take.pdf");
    assert.equal(report.type, "application/pdf");
    assert.equal(fetchMock.mock.callCount(), 2);
  });

  it("posts stock take import dry-runs by public reference", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2026-0001/imports/dry-run",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          contentType: "text/csv",
          csv: "sku,countedQuantity\nRICE-5KG,12",
          fileName: "count.csv",
        });

        return jsonResponse({
          canApply: true,
          errors: [],
          locationName: "Central Shop",
          locationSlug: "central-shop",
          rows: [
            {
              availableQuantity: 8,
              countedQuantity: 12,
              lineNumber: 1,
              note: null,
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
          stockTakeReference: "STK-2026-0001",
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
      },
    );

    const response = await dryRunStockTakeImport("manager", "STK-2026-0001", {
      contentType: "text/csv",
      csv: "sku,countedQuantity\nRICE-5KG,12",
      fileName: "count.csv",
    });

    const [row] = response.rows;

    assert.equal(response.canApply, true);
    assert.ok(row);
    assert.equal(row.variance, 2);
    assert.equal(fetchMock.mock.callCount(), 1);
  });

  it("posts reviewed stock take imports to the apply endpoint", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(
          String(input),
          "http://localhost:4000/api/manager/stock-takes/STK-2026-0001/apply",
        );
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          contentType: "text/csv",
          csv: "sku,countedQuantity\nRICE-5KG,12",
          fileName: "count.csv",
          reviewed: true,
        });

        return jsonResponse({
          appliedAt: "2026-05-04T09:30:00.000Z",
          appliedByUserSlug: "manager-user",
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
          locationName: "Central Shop",
          locationSlug: "central-shop",
          status: "applied",
          stockTakeReference: "STK-2026-0001",
          summary: {
            appliedRows: 1,
            changedRows: 1,
            noChangeRows: 0,
            totalNegativeDelta: 0,
            totalPositiveDelta: 2,
          },
        });
      },
    );

    const response = await applyStockTakeImport("manager", "STK-2026-0001", {
      contentType: "text/csv",
      csv: "sku,countedQuantity\nRICE-5KG,12",
      fileName: "count.csv",
      reviewed: true,
    });

    assert.equal(response.status, "applied");
    assert.equal(response.summary.changedRows, 1);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
