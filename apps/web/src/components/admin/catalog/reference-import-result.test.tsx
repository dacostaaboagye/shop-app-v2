import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogReferenceImportResponse } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferenceImportResult } from "./reference-import-result";

Object.assign(globalThis, { React });

const failedImport: CatalogReferenceImportResponse = {
  entity: "brand",
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
      originalRow: { name: "Existing Brand", status: "active" },
      rowNumber: 3,
    },
  ],
  fileName: "brands.csv",
  importedSlugs: ["new-brand"],
  processedAt: "2026-05-03T00:00:00.000Z",
  summary: {
    failedRows: 1,
    importedRows: 1,
    maxRows: 1_000,
    totalRows: 2,
    truncated: false,
  },
};

describe("ReferenceImportResult", () => {
  it("renders summary counts and failed-row download action", () => {
    const markup = renderToStaticMarkup(
      <ReferenceImportResult
        onDownload={() => undefined}
        result={failedImport}
      />,
    );

    assert.match(markup, /Import needs review/);
    assert.match(markup, /Total rows/);
    assert.match(markup, /Imported/);
    assert.match(markup, /Failed/);
    assert.match(markup, /Row 3/);
    assert.match(markup, /Name already exists/);
    assert.match(markup, /Download failed rows/);
  });

  it("hides failed-row details for clean imports", () => {
    const markup = renderToStaticMarkup(
      <ReferenceImportResult
        onDownload={() => undefined}
        result={{
          ...failedImport,
          failedRows: [],
          summary: { ...failedImport.summary, failedRows: 0, importedRows: 2 },
        }}
      />,
    );

    assert.match(markup, /Import complete/);
    assert.doesNotMatch(markup, /Download failed rows/);
  });
});
