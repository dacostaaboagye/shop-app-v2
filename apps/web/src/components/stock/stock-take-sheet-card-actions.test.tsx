import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeSessionSummary } from "@shop/contracts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeneratedSheetActions } from "./stock-take-sheet-card-actions";

Object.assign(globalThis, { React });

describe("GeneratedSheetActions", () => {
  it("presents XLSX workbook as the primary generated artifact", () => {
    const markup = renderToStaticMarkup(
      <GeneratedSheetActions
        csvError={null}
        isCsvPending={false}
        isPdfPending={false}
        isWorkbookPending={false}
        onDownloadCsv={() => undefined}
        onDownloadPdf={() => undefined}
        onDownloadWorkbook={() => undefined}
        pdfError={null}
        sheet={createSheet()}
        workbookError={null}
      />,
    );

    assert.match(markup, /Download workbook \(.xlsx\)/);
    assert.match(markup, /CSV fallback/);
    assert.match(markup, /Review CSV import/);
    assert.ok(
      markup.indexOf("Download workbook (.xlsx)") <
        markup.indexOf("CSV fallback"),
    );
  });
});

function createSheet(): StockTakeSessionSummary {
  return {
    appliedAt: null,
    appliedByUserSlug: null,
    blankSheet: false,
    bookletPdfUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/booklet.pdf",
    generatedAt: "2026-05-04T10:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: 12,
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode: "blind",
    printableBookletUrl: "/manager/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/manager/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
    varianceReportPdfUrl: null,
  };
}
