import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StockTakeSheetCard } from "./stock-take-sheet-card";

Object.assign(globalThis, { React });

describe("StockTakeSheetCard", () => {
  it("hides location selection when the page owns the location context", () => {
    const markup = renderCard({ locationControl: "fixed" });

    assert.doesNotMatch(markup, />Location</);
    assert.match(markup, /Workbook mode/);
    assert.match(markup, /Generate workbook/);
  });

  it("renders location selection when the card owns the location choice", () => {
    const markup = renderCard();

    assert.match(markup, />Location</);
    assert.match(markup, /central-shop/);
  });
});

function renderCard(input: { locationControl?: "fixed" | "select" } = {}) {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <StockTakeSheetCard
        initialLocationSlug="central-shop"
        {...(input.locationControl
          ? { locationControl: input.locationControl }
          : {})}
        locations={[
          { name: "Central Shop", slug: "central-shop" },
          { name: "Warehouse", slug: "warehouse" },
        ]}
        portal="manager"
      />
    </QueryClientProvider>,
  );
}
