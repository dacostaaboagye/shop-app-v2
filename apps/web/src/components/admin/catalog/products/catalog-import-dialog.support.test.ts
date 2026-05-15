import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CatalogImportReportResponse,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import {
  canStartCatalogImport,
  failedRowsToCsv,
  formatImportStatus,
  getImportStatusCopy,
  isTerminalImportStatus,
  shouldRefreshProductList,
} from "./catalog-import-dialog.support";

const uploadResult: CatalogImportUploadResponse = {
  acceptedAt: "2026-05-03T00:00:00.000Z",
  fileName: "products.csv",
  jobReference: "CIMP-ABC123",
  maxRows: 500,
  status: "queued",
};

describe("catalog import dialog support", () => {
  it("classifies terminal and product-refresh statuses", () => {
    assert.equal(isTerminalImportStatus("queued"), false);
    assert.equal(isTerminalImportStatus("processing"), false);
    assert.equal(isTerminalImportStatus("completed"), true);
    assert.equal(isTerminalImportStatus("completed_with_errors"), true);
    assert.equal(isTerminalImportStatus("failed"), true);

    assert.equal(shouldRefreshProductList("completed"), true);
    assert.equal(shouldRefreshProductList("completed_with_errors"), true);
    assert.equal(shouldRefreshProductList("failed"), false);
  });

  it("prevents duplicate starts after a job is accepted", () => {
    assert.equal(
      canStartCatalogImport({
        hasAcceptedJob: false,
        hasSelectedFile: true,
        importPending: false,
      }),
      true,
    );
    assert.equal(
      canStartCatalogImport({
        hasAcceptedJob: true,
        hasSelectedFile: true,
        importPending: false,
      }),
      false,
    );
    assert.equal(
      canStartCatalogImport({
        hasAcceptedJob: false,
        hasSelectedFile: true,
        importPending: true,
      }),
      false,
    );
  });

  it("returns clear copy for queued, processing, and failed jobs", () => {
    assert.equal(
      formatImportStatus("completed_with_errors"),
      "completed with errors",
    );
    assert.match(getImportStatusCopy("queued", uploadResult), /queued/);
    assert.match(getImportStatusCopy("processing", uploadResult), /processing/);
    assert.match(
      getImportStatusCopy("failed", uploadResult),
      /failed before it could complete/,
    );
  });

  it("builds a failed-row CSV report with escaped values", () => {
    const report: CatalogImportReportResponse = {
      failedRows: [
        {
          errors: [
            {
              code: "invalid_value",
              field: "productName",
              message: 'Name contains "invalid" text',
              rowNumber: 2,
            },
          ],
          originalRow: { productName: 'Bad "Name"', sku: "SKU-1" },
          rowNumber: 2,
        },
      ],
      generatedAt: "2026-05-03T00:00:00.000Z",
      jobReference: "CIMP-ABC123",
      summary: {
        invalidRows: 1,
        maxRows: 500,
        totalRows: 1,
        truncated: false,
        validRows: 0,
      },
    };

    const csv = failedRowsToCsv(report);

    assert.match(csv, /^rowNumber,errors,values\n/);
    assert.match(csv, /"2","Name contains ""invalid"" text"/);
    assert.match(csv, /""sku"":""SKU-1""/);
  });
});
