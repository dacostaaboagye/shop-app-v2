import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StockTakeDetailResponse } from "@/lib/react-query/stock-takes";
import { StockTakeFinalReportCard } from "./stock-take-final-report-card";

Object.assign(globalThis, { React });

describe("StockTakeFinalReportCard", () => {
  it("renders applied variance report actions", () => {
    const markup = renderWithClient(
      <StockTakeFinalReportCard
        applyResult={null}
        portal="manager"
        stockTake={buildStockTake("applied")}
      />,
    );

    assert.match(markup, /Final variance report/);
    assert.match(markup, /Download PDF/);
    assert.match(markup, /Audit evidence/);
  });

  it("stays hidden until the stock take is applied", () => {
    const markup = renderWithClient(
      <StockTakeFinalReportCard
        applyResult={null}
        portal="manager"
        stockTake={buildStockTake("generated")}
      />,
    );

    assert.equal(markup, "");
  });
});

function renderWithClient(children: React.ReactNode): string {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

function buildStockTake(
  status: StockTakeDetailResponse["status"],
): StockTakeDetailResponse {
  return {
    appliedAt: status === "applied" ? "2026-05-04T10:15:00.000Z" : null,
    appliedByUserSlug: status === "applied" ? "manager" : null,
    blankSheet: false,
    bookletPdfUrl: "/api/manager/stock-takes/STK-2026-0001/booklet.pdf",
    generatedAt: "2026-05-04T10:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: 1,
    lines: [
      {
        appliedDelta: status === "applied" ? 2 : null,
        availableQuantity: null,
        countedQuantity: status === "applied" ? 12 : null,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        productSlug: "rice",
        reservedQuantity: null,
        rowStatus: status === "applied" ? "counted" : "catalog_sku",
        sku: "RICE-5KG",
        systemOnHand: null,
        unitOfMeasure: "bag",
        variance: null,
        variantName: "5kg",
        variantSlug: "rice-5kg",
      },
    ],
    locationName: "Central Shop",
    locationSlug: "central-shop",
    mode: "blind",
    printableBookletUrl: "/manager/stock/takes/STK-2026-0001/booklet",
    sheetCsvUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/manager/stock-takes/STK-2026-0001/sheet.xlsx",
    status,
    stockTakeReference: "STK-2026-0001",
    varianceReportPdfUrl:
      status === "applied"
        ? "/api/manager/stock-takes/STK-2026-0001/variance-report.pdf"
        : null,
  };
}
