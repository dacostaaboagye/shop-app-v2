import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toRoute } from "@/lib/routes";
import { CatalogHistoryPageView } from "./catalog-history-page-view";

Object.assign(globalThis, { React });

describe("CatalogHistoryPageView", () => {
  it("renders the title, description, and back link to the entity detail page", () => {
    const markup = renderToStaticMarkup(
      <CatalogHistoryPageView
        backHref={toRoute("/admin/products/cedar-thread-city-crossbody")}
        backLabel="Back to product"
        description="All edits, archives, and restores for Cedar Thread City Crossbody."
        title="Change history"
      >
        <div data-testid="history-list-mount">list mount</div>
      </CatalogHistoryPageView>,
    );

    assert.match(markup, /Change history/);
    assert.match(
      markup,
      /All edits, archives, and restores for Cedar Thread City Crossbody\./,
    );
    assert.match(markup, /Back to product/);
    assert.match(
      markup,
      /href="\/admin\/products\/cedar-thread-city-crossbody"/,
    );
    assert.match(markup, /history-list-mount/);
  });

  it("does not advertise the inline panel copy that the dedicated page replaces", () => {
    const markup = renderToStaticMarkup(
      <CatalogHistoryPageView
        backHref={toRoute("/admin/products/brands/atlas-imports")}
        backLabel="Back to brand"
        description="All edits, archives, and restores for Atlas Imports."
        title="Change history"
      >
        <span>placeholder</span>
      </CatalogHistoryPageView>,
    );

    assert.doesNotMatch(markup, /Show history/);
    assert.doesNotMatch(markup, /Hide history/);
  });
});
