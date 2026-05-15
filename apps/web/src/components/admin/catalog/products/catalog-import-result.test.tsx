import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CatalogImportJobResponse,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogImportResult } from "./catalog-import-result";

Object.assign(globalThis, { React });

const uploadResult: CatalogImportUploadResponse = {
  acceptedAt: "2026-05-03T00:00:00.000Z",
  fileName: "products.csv",
  jobReference: "CIMP-ABC123",
  maxRows: 500,
  status: "queued",
};

const completedWithErrorsJob: CatalogImportJobResponse = {
  completedAt: "2026-05-03T00:01:00.000Z",
  createdAt: "2026-05-03T00:00:00.000Z",
  fileName: "products.csv",
  jobReference: "CIMP-ABC123",
  reportAvailable: true,
  status: "completed_with_errors",
  summary: {
    invalidRows: 2,
    maxRows: 500,
    totalRows: 12,
    truncated: false,
    validRows: 10,
  },
};

describe("CatalogImportResult", () => {
  it("renders job summary counts and failed-row report action when available", () => {
    const markup = renderToStaticMarkup(
      <CatalogImportResult
        job={completedWithErrorsJob}
        jobError={null}
        jobPending={false}
        onReport={() => undefined}
        pendingReport={false}
        result={uploadResult}
      />,
    );

    assert.match(markup, /Total rows/);
    assert.match(markup, /12/);
    assert.match(markup, /Imported/);
    assert.match(markup, /10/);
    assert.match(markup, /Failed/);
    assert.match(markup, /2/);
    assert.match(markup, /Download failed rows/);
  });

  it("hides the failed-row report action when no report is available", () => {
    const markup = renderToStaticMarkup(
      <CatalogImportResult
        job={{ ...completedWithErrorsJob, reportAvailable: false }}
        jobError={null}
        jobPending={false}
        onReport={() => undefined}
        pendingReport={false}
        result={uploadResult}
      />,
    );

    assert.doesNotMatch(markup, /Download failed rows/);
  });
});
