import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogReferenceImportResponseSchema,
  catalogReferenceImportTemplateResponseSchema,
  catalogReferenceImportUploadRequestSchema,
} from "./catalog-reference-import.js";

describe("catalog reference import contracts", () => {
  it("accepts brand and category templates", () => {
    const template = catalogReferenceImportTemplateResponseSchema.parse({
      columns: [
        {
          description: "Brand display name.",
          example: "Atlas Imports",
          name: "name",
          required: true,
        },
      ],
      csv: "name\nAtlas Imports",
      entity: "brand",
      format: "csv",
    });

    assert.equal(template.entity, "brand");
  });

  it("accepts upload requests and row-level import responses", () => {
    const request = catalogReferenceImportUploadRequestSchema.parse({
      contentType: "text/csv",
      csv: "name,status\nAtlas Imports,active",
      fileName: "brands.csv",
    });
    const response = catalogReferenceImportResponseSchema.parse({
      entity: "category",
      failedRows: [
        {
          errors: [
            {
              code: "existing_name",
              field: "name",
              message: "Name already exists.",
              rowNumber: 3,
            },
          ],
          originalRow: { name: "Footwear", status: "active" },
          rowNumber: 3,
        },
      ],
      fileName: "categories.csv",
      importedSlugs: ["footwear"],
      processedAt: "2026-05-03T12:00:00.000Z",
      summary: {
        failedRows: 1,
        importedRows: 1,
        maxRows: 1000,
        totalRows: 2,
        truncated: false,
      },
    });

    assert.equal(request.fileName, "brands.csv");
    assert.equal(response.importedSlugs[0], "footwear");
  });
});
