import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StockTakeDetailResponse } from "@/lib/react-query/stock-takes";
import { StockTakeCountEntryPanel } from "./stock-take-count-entry-panel";

Object.assign(globalThis, { React });

describe("StockTakeCountEntryPanel", () => {
  it("renders one row per session line in the order received", () => {
    const markup = renderPanel({ status: "generated" });

    const riceIndex = markup.indexOf("Rice");
    const beanIndex = markup.indexOf("Beans");
    assert.ok(riceIndex >= 0);
    assert.ok(beanIndex >= 0);
    assert.ok(riceIndex < beanIndex);
    assert.match(markup, /RICE-5KG/);
    assert.match(markup, /BEAN-2KG/);
    assert.match(markup, /Line 1/);
    assert.match(markup, /Line 2/);
  });

  it("disables row inputs when the session is applied", () => {
    const markup = renderPanel({ status: "applied" });

    const inputDisabled = markup.match(/<input[^>]*disabled[^>]*>/g) ?? [];
    const textareaDisabled =
      markup.match(/<textarea[^>]*disabled[^>]*>/g) ?? [];
    assert.ok(inputDisabled.length >= 2);
    assert.ok(textareaDisabled.length >= 2);
  });

  it("uses mobile-first stacking on rows without requiring md: variants", () => {
    const markup = renderPanel({ status: "generated" });

    assert.match(markup, /md:flex-row/);
    assert.match(markup, /md:grid-cols-/);
    assert.match(markup, /flex-col/);
  });

  it("offers a search field labelled for product, variant, or SKU", () => {
    const markup = renderPanel({ status: "generated" });

    assert.match(markup, /Search this session/);
    assert.match(markup, /Product, variant, or SKU/);
  });

  it("renders an empty state when the session has no lines", () => {
    const markup = renderPanel({
      lines: [],
      status: "generated",
    });

    assert.match(markup, /No lines to count yet/);
  });
});

function renderPanel(input: {
  lines?: StockTakeDetailResponse["lines"];
  status: StockTakeDetailResponse["status"];
}): string {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <StockTakeCountEntryPanel
        detail={buildDetail({
          lines: input.lines ?? defaultLines(),
          status: input.status,
        })}
        portal="admin"
      />
    </QueryClientProvider>,
  );
}

function buildDetail(input: {
  lines: StockTakeDetailResponse["lines"];
  status: StockTakeDetailResponse["status"];
}): StockTakeDetailResponse {
  return {
    appliedAt: input.status === "applied" ? "2026-05-04T10:00:00.000Z" : null,
    appliedByUserSlug: null,
    blankSheet: false,
    bookletPdfUrl: "/api/admin/stock-takes/STK-1/booklet.pdf",
    generatedAt: "2026-05-04T09:00:00.000Z",
    generatedByUserSlug: "manager",
    lineCount: input.lines.length,
    lines: input.lines,
    locationName: "Central Shop",
    locationSlug: "central-shop",
    mode: "blind",
    printableBookletUrl: "/admin/stock/takes/STK-1/booklet",
    sheetCsvUrl: "/api/admin/stock-takes/STK-1/sheet.csv",
    sheetXlsxUrl: "/api/admin/stock-takes/STK-1/sheet.xlsx",
    status: input.status,
    stockTakeReference: "STK-1",
    varianceReportPdfUrl: null,
  };
}

function defaultLines(): StockTakeDetailResponse["lines"] {
  return [
    {
      appliedDelta: null,
      availableQuantity: null,
      countedQuantity: null,
      lineNumber: 1,
      note: null,
      productName: "Rice",
      productSlug: "rice",
      reservedQuantity: null,
      rowStatus: "catalog_sku",
      sku: "RICE-5KG",
      systemOnHand: null,
      unitOfMeasure: "bag",
      variance: null,
      variantName: "5kg",
      variantSlug: "rice-5kg",
    },
    {
      appliedDelta: null,
      availableQuantity: null,
      countedQuantity: 4,
      lineNumber: 2,
      note: "back shelf",
      productName: "Beans",
      productSlug: "beans",
      reservedQuantity: null,
      rowStatus: "catalog_sku",
      sku: "BEAN-2KG",
      systemOnHand: null,
      unitOfMeasure: "bag",
      variance: null,
      variantName: "2kg",
      variantSlug: "beans-2kg",
    },
  ];
}
