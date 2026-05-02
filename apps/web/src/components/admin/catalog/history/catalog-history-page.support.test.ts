import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBrandHistoryPageProps,
  buildCategoryHistoryPageProps,
  buildProductHistoryPageProps,
  buildVariantHistoryPageProps,
} from "./catalog-history-page.support";

describe("catalog history page prop builders", () => {
  describe("buildProductHistoryPageProps", () => {
    it("includes the entity name in the description and links back to the detail page", () => {
      const props = buildProductHistoryPageProps(
        {
          name: "Cedar Thread City Crossbody",
          slug: "cedar-thread-city-crossbody",
        },
        "fallback-slug",
      );

      assert.equal(props.title, "Change history");
      assert.equal(
        props.description,
        "All edits, archives, and restores for Cedar Thread City Crossbody.",
      );
      assert.equal(
        props.backHref,
        "/admin/products/cedar-thread-city-crossbody",
      );
      assert.equal(props.backLabel, "Back to product");
    });

    it("falls back to the slug-based detail link with not-found copy when the product is missing", () => {
      const props = buildProductHistoryPageProps(null, "ghost-slug");

      assert.equal(props.backHref, "/admin/products/ghost-slug");
      assert.match(props.description, /could not be found/);
      assert.doesNotMatch(props.description, /restores for/);
    });
  });

  describe("buildBrandHistoryPageProps", () => {
    it("links back to the brand detail and surfaces the brand name", () => {
      const props = buildBrandHistoryPageProps(
        { name: "Atlas Imports", slug: "atlas-imports" },
        "atlas-imports",
      );

      assert.equal(props.backHref, "/admin/products/brands/atlas-imports");
      assert.equal(props.backLabel, "Back to brand");
      assert.equal(
        props.description,
        "All edits, archives, and restores for Atlas Imports.",
      );
    });

    it("uses the not-found description and slug fallback when the brand is null", () => {
      const props = buildBrandHistoryPageProps(null, "missing-brand");

      assert.equal(props.backHref, "/admin/products/brands/missing-brand");
      assert.match(props.description, /could not be found/);
    });
  });

  describe("buildCategoryHistoryPageProps", () => {
    it("links back to the category detail and surfaces the category name", () => {
      const props = buildCategoryHistoryPageProps(
        { name: "Homewares", slug: "homewares" },
        "homewares",
      );

      assert.equal(props.backHref, "/admin/products/categories/homewares");
      assert.equal(props.backLabel, "Back to category");
      assert.equal(
        props.description,
        "All edits, archives, and restores for Homewares.",
      );
    });

    it("falls back when the category is null", () => {
      const props = buildCategoryHistoryPageProps(null, "missing-cat");

      assert.equal(props.backHref, "/admin/products/categories/missing-cat");
      assert.match(props.description, /could not be found/);
    });
  });

  describe("buildVariantHistoryPageProps", () => {
    it("uses the variant name in the description and the product name in the back label", () => {
      const props = buildVariantHistoryPageProps(
        {
          name: "Cedar Thread City Crossbody",
          slug: "cedar-thread-city-crossbody",
        },
        { name: "Medium / Walnut", slug: "medium-walnut" },
        "cedar-thread-city-crossbody",
      );

      assert.equal(
        props.backHref,
        "/admin/products/cedar-thread-city-crossbody",
      );
      assert.equal(props.backLabel, "Back to Cedar Thread City Crossbody");
      assert.equal(
        props.description,
        "All edits, archives, and restores for Medium / Walnut.",
      );
    });

    it("falls back to the product slug back-link when the product is missing", () => {
      const props = buildVariantHistoryPageProps(null, null, "fallback-slug");

      assert.equal(props.backHref, "/admin/products/fallback-slug");
      assert.equal(props.backLabel, "Back to product");
      assert.match(props.description, /could not be found/);
    });

    it("falls back when only the variant is missing, even if the product loaded", () => {
      const props = buildVariantHistoryPageProps(
        {
          name: "Cedar Thread City Crossbody",
          slug: "cedar-thread-city-crossbody",
        },
        null,
        "cedar-thread-city-crossbody",
      );

      assert.match(props.description, /could not be found/);
    });
  });
});
