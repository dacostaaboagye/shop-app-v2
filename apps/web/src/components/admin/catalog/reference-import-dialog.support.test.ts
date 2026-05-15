import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogReferenceImportResponse } from "@shop/contracts";
import {
  getFailedRowSummary,
  getReferenceImportResultCopy,
  referenceFailedRowsToCsv,
} from "./reference-import-dialog.support";

const failedImport: CatalogReferenceImportResponse = {
  entity: "brand",
  failedRows: [
    {
      errors: [
        {
          code: "duplicate_name",
          field: "name",
          message: 'Name "Acme" is duplicated',
          rowNumber: 3,
        },
      ],
      originalRow: { description: "Preferred vendor", name: 'Acme "Prime"' },
      rowNumber: 3,
    },
  ],
  fileName: "brands.csv",
  importedSlugs: ["valid-brand"],
  processedAt: "2026-05-03T00:00:00.000Z",
  summary: {
    failedRows: 1,
    importedRows: 1,
    maxRows: 500,
    totalRows: 2,
    truncated: false,
  },
};

describe("reference import dialog support", () => {
  it("formats success and partial-failure summary copy", () => {
    assert.equal(
      getReferenceImportResultCopy({
        ...failedImport,
        failedRows: [],
        summary: { ...failedImport.summary, failedRows: 0, importedRows: 2 },
      }),
      "2 row(s) imported.",
    );
    assert.equal(
      getReferenceImportResultCopy(failedImport),
      "1 row(s) imported and 1 row(s) need correction.",
    );
  });

  it("builds failed-row CSV output with escaped cells", () => {
    const csv = referenceFailedRowsToCsv(failedImport);

    assert.match(csv, /^rowNumber,errors,description,name\n/);
    assert.match(csv, /"Name ""Acme"" is duplicated"/);
    assert.match(csv, /"Acme ""Prime"""/);
  });

  it("summarizes row errors for inline review", () => {
    const firstFailedRow = failedImport.failedRows[0];
    assert.ok(firstFailedRow);

    assert.equal(
      getFailedRowSummary(firstFailedRow),
      'Name "Acme" is duplicated',
    );
  });
});
