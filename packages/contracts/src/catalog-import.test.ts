import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogImportDryRunResponseSchema,
  catalogImportJobResponseSchema,
  catalogImportReportResponseSchema,
  catalogImportRequiredColumns,
  catalogImportTemplateResponseSchema,
  catalogImportUploadRequestSchema,
  catalogImportUploadResponseSchema,
} from "./catalog-import.js";

const summary = {
  invalidRows: 1,
  maxRows: 1000,
  totalRows: 2,
  truncated: false,
  validRows: 1,
};

const normalizedRow = {
  attributes: { color: "black" },
  costPrice: "10.00",
  productName: "Training Shoe",
  rowNumber: 2,
  sellingPrice: "15.00",
  sku: "SHOE-BLK-42",
  status: "active",
  unitOfMeasure: "each",
  variantName: "Black / 42",
};

const rowError = {
  code: "missing_required",
  field: "sku",
  message: "sku is required.",
  rowNumber: 3,
};

describe("catalog import contracts", () => {
  it("describes the CSV template columns without internal identifiers", () => {
    const parsed = catalogImportTemplateResponseSchema.parse({
      columns: [
        {
          description: "Product display name.",
          example: "Training Shoe",
          name: "productName",
          required: true,
        },
      ],
      csv: "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
      exampleRows: [{ productName: "Training Shoe", sku: "SHOE-BLK-42" }],
      format: "csv",
      optionalColumns: ["barcode", "attributesJson"],
      requiredColumns: [...catalogImportRequiredColumns],
    });

    assert.equal(parsed.format, "csv");
    assert.equal(parsed.requiredColumns.includes("sku"), true);
  });

  it("accepts upload, dry-run, job, and report responses by public reference", () => {
    const request = catalogImportUploadRequestSchema.parse({
      contentType: "text/csv",
      csv: "productName,variantName,sku,unitOfMeasure,costPrice,sellingPrice",
      fileName: "catalog.csv",
    });
    const upload = catalogImportUploadResponseSchema.parse({
      acceptedAt: "2026-05-03T10:00:00.000Z",
      fileName: "catalog.csv",
      jobReference: "CIMP-00001",
      maxRows: 1000,
      status: "queued",
    });
    const dryRun = catalogImportDryRunResponseSchema.parse({
      errors: [rowError],
      summary,
      validRows: [normalizedRow],
    });
    const job = catalogImportJobResponseSchema.parse({
      completedAt: null,
      createdAt: "2026-05-03T10:00:00.000Z",
      fileName: "catalog.csv",
      jobReference: "CIMP-00001",
      reportAvailable: true,
      status: "completed_with_errors",
      summary,
    });
    const report = catalogImportReportResponseSchema.parse({
      failedRows: [
        {
          errors: [rowError],
          originalRow: { productName: "Training Shoe", sku: "" },
          rowNumber: 3,
        },
      ],
      generatedAt: "2026-05-03T10:05:00.000Z",
      jobReference: "CIMP-00001",
      summary,
    });

    assert.equal(request.fileName, "catalog.csv");
    assert.equal(upload.jobReference, "CIMP-00001");
    assert.equal(dryRun.validRows[0]?.sku, "SHOE-BLK-42");
    assert.equal(job.reportAvailable, true);
    assert.equal(report.failedRows[0]?.errors[0]?.code, "missing_required");
  });

  it("rejects raw internal IDs on response payloads", () => {
    assert.throws(() =>
      catalogImportUploadResponseSchema.parse({
        acceptedAt: "2026-05-03T10:00:00.000Z",
        fileName: "catalog.csv",
        jobId: "00000000-0000-4000-8000-000000000001",
        jobReference: "CIMP-00001",
        maxRows: 1000,
        status: "queued",
      }),
    );
  });

  it("accepts header-level report failures and service-layer original row maps", () => {
    const report = catalogImportReportResponseSchema.parse({
      failedRows: [
        {
          errors: [
            {
              code: "missing_required",
              field: "sellingPrice",
              message: "sellingPrice is required.",
              rowNumber: 1,
            },
          ],
          originalRow: {},
          rowNumber: 1,
        },
        {
          errors: [
            {
              code: "invalid_value",
              message: "Row could not be imported.",
              rowNumber: 2,
            },
          ],
          originalRow: {
            attributesJson: '{"color":"black"}',
            productName: "Training Shoe",
            sku: "SHOE-BLK-42",
          },
          rowNumber: 2,
        },
      ],
      generatedAt: "2026-05-03T10:05:00.000Z",
      jobReference: "CIMP-00001",
      summary,
    });

    assert.equal(report.failedRows[0]?.rowNumber, 1);
    assert.equal(
      report.failedRows[1]?.originalRow.attributesJson,
      '{"color":"black"}',
    );
  });
});
