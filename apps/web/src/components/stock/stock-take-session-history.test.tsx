import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getActiveMutationReference,
  StockTakeSessionHistoryList,
} from "./stock-take-session-history";

Object.assign(globalThis, { React });

describe("StockTakeSessionHistoryList", () => {
  it("renders session history actions and audit metadata", () => {
    const markup = renderToStaticMarkup(
      <StockTakeSessionHistoryList
        portal="manager"
        response={{
          items: [
            {
              appliedAt: null,
              appliedByUserSlug: null,
              blankSheet: false,
              bookletPdfUrl:
                "/api/manager/stock-takes/STKTAKE-2026-0001/booklet.pdf",
              generatedAt: "2026-05-04T10:00:00.000Z",
              generatedByUserSlug: "store-manager",
              lineCount: 12,
              locationName: "Downtown Store",
              locationSlug: "downtown-store",
              mode: "blind",
              printableBookletUrl:
                "/manager/stock/takes/STKTAKE-2026-0001/booklet",
              sheetCsvUrl:
                "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.csv",
              sheetXlsxUrl:
                "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
              status: "generated",
              stockTakeReference: "STKTAKE-2026-0001",
              varianceReportPdfUrl: null,
            },
          ],
          page: 1,
          pageSize: 25,
          totalCount: 1,
        }}
        onDelete={() => undefined}
        onDownloadWorkbook={() => undefined}
      />,
    );

    assert.match(markup, /STKTAKE-2026-0001/);
    assert.match(markup, /Downtown Store/);
    assert.match(markup, /Workbook/);
    assert.match(markup, /Review/);
    assert.match(markup, /Booklet/);
    assert.match(markup, /Delete/);
  });

  it("does not render delete for applied sessions", () => {
    const markup = renderToStaticMarkup(
      <StockTakeSessionHistoryList
        portal="admin"
        response={{
          items: [
            {
              appliedAt: "2026-05-04T11:00:00.000Z",
              appliedByUserSlug: "admin",
              blankSheet: false,
              bookletPdfUrl:
                "/api/admin/stock-takes/STKTAKE-2026-0001/booklet.pdf",
              generatedAt: "2026-05-04T10:00:00.000Z",
              generatedByUserSlug: "admin",
              lineCount: 12,
              locationName: "Downtown Store",
              locationSlug: "downtown-store",
              mode: "blind",
              printableBookletUrl:
                "/admin/stock/takes/STKTAKE-2026-0001/booklet",
              sheetCsvUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
              sheetXlsxUrl:
                "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
              status: "applied",
              stockTakeReference: "STKTAKE-2026-0001",
              varianceReportPdfUrl:
                "/api/admin/stock-takes/STKTAKE-2026-0001/variance-report.pdf",
            },
          ],
          page: 1,
          pageSize: 25,
          totalCount: 1,
        }}
        onDelete={() => undefined}
        onDownloadWorkbook={() => undefined}
      />,
    );

    assert.doesNotMatch(markup, /Delete/);
  });

  it("renders an empty state when no sessions exist", () => {
    const markup = renderToStaticMarkup(
      <StockTakeSessionHistoryList
        portal="admin"
        response={{ items: [], page: 1, pageSize: 25, totalCount: 0 }}
      />,
    );

    assert.match(markup, /No stock-take sessions yet/);
  });

  it("clears action loading state when a mutation finishes", () => {
    assert.equal(
      getActiveMutationReference(true, "STKTAKE-2026-0001"),
      "STKTAKE-2026-0001",
    );
    assert.equal(getActiveMutationReference(false, "STKTAKE-2026-0001"), null);
    assert.equal(getActiveMutationReference(true), null);
  });
});
