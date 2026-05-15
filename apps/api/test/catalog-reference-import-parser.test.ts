import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReferenceImportCsv } from "../src/modules/catalog/catalog-reference-import-parser.js";

describe("parseReferenceImportCsv", () => {
  it("parses clean brand rows", () => {
    const result = parseReferenceImportCsv(
      [
        "name,description,website,status",
        "Atlas Imports,Regional supplier,https://example.com,active",
      ].join("\n"),
      "brand",
    );

    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0]?.name, "Atlas Imports");
    assert.equal(result.rows[0]?.website, "https://example.com");
  });

  it("parses clean category rows with parent slugs", () => {
    const result = parseReferenceImportCsv(
      [
        "name,description,parentCategorySlug,status",
        "Running Shoes,Performance shoes,footwear,archived",
      ].join("\n"),
      "category",
    );

    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0]?.parentCategorySlug, "footwear");
    assert.equal(result.rows[0]?.status, "archived");
  });

  it("reports missing names, invalid statuses, duplicates, and unsupported columns", () => {
    const badHeader = parseReferenceImportCsv("name,bad\nAtlas,x", "brand");
    const badRows = parseReferenceImportCsv(
      [
        "name,status",
        ",active",
        "Atlas,draft",
        "Bata,active",
        "Bata,active",
      ].join("\n"),
      "brand",
    );

    assert.equal(badHeader.errors[0]?.errors[0]?.code, "malformed_csv");
    assert.deepEqual(
      badRows.errors.map((row) => row.errors[0]?.code),
      ["missing_required", "invalid_status", "duplicate_name"],
    );
  });

  it("reports empty files without treating invalid rows as duplicates", () => {
    const empty = parseReferenceImportCsv("", "category");
    const invalidThenValid = parseReferenceImportCsv(
      ["name,status", "Footwear,draft", "Footwear,active"].join("\n"),
      "category",
    );

    assert.equal(empty.errors[0]?.errors[0]?.code, "malformed_csv");
    assert.deepEqual(
      invalidThenValid.errors.map((row) => row.errors[0]?.code),
      ["invalid_status"],
    );
    assert.equal(invalidThenValid.rows.length, 1);
  });
});
