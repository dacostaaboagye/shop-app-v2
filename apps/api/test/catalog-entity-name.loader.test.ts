import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogChangeEntityType } from "../src/modules/catalog-change-log/catalog-change-log.types.js";
import { loadEntityNames } from "../src/modules/catalog-change-log/catalog-entity-name.loader.js";

/**
 * Hand-rolled drizzle stub. Each call to `db.select(shape).from(table)
 * .where(...)` is captured here so the test can assert which physical
 * table + display column the loader chose for the given entity type.
 *
 * We don't run real SQL. drizzle's column metadata (the `_` symbol-keyed
 * object on each PgColumn) carries the table and column names, and the
 * stub returns whatever the test preconfigured for that table.
 */
type ColumnRef = { name: string };
type SelectShape = { id: ColumnRef; name: ColumnRef };
type RecordedCall = {
  table: string;
  selectedNameColumn: string;
};

const DRIZZLE_NAME = Symbol.for("drizzle:Name");

function makeStubDb(input: {
  responses: Record<string, Array<{ id: string; name: string }>>;
  calls: RecordedCall[];
}) {
  return {
    select(shape: SelectShape) {
      const selectedNameColumn = shape.name.name;
      return {
        from(table: Record<symbol, string>) {
          const tableName = table[DRIZZLE_NAME] ?? "";
          return {
            where() {
              input.calls.push({
                table: tableName,
                selectedNameColumn,
              });
              return Promise.resolve(input.responses[tableName] ?? []);
            },
          };
        },
      };
    },
  };
}

describe("catalog entity name loader", () => {
  it("short-circuits without querying when ids is empty", async () => {
    const calls: RecordedCall[] = [];
    const db = makeStubDb({ responses: {}, calls });

    const result = await loadEntityNames(db as never, "catalog_product", []);

    assert.equal(result.size, 0);
    assert.equal(calls.length, 0);
  });

  it("dedupes ids before issuing the IN query (single call)", async () => {
    const calls: RecordedCall[] = [];
    const db = makeStubDb({
      responses: {
        catalog_products: [{ id: "p1", name: "Widget" }],
      },
      calls,
    });

    const result = await loadEntityNames(db as never, "catalog_product", [
      "p1",
      "p1",
      "p1",
    ]);

    assert.equal(result.get("p1"), "Widget");
    assert.equal(calls.length, 1);
  });

  it("routes each entity type to the right table and display column", async () => {
    const cases: Array<{
      type: CatalogChangeEntityType;
      table: string;
      column: string;
    }> = [
      { type: "catalog_brand", table: "catalog_brands", column: "name" },
      {
        type: "catalog_category",
        table: "catalog_categories",
        column: "name",
      },
      { type: "catalog_product", table: "catalog_products", column: "name" },
      { type: "product_variant", table: "product_variants", column: "name" },
      {
        type: "catalog_product_option",
        table: "catalog_product_options",
        column: "name",
      },
      {
        type: "catalog_product_option_value",
        table: "catalog_product_option_values",
        column: "value",
      },
    ];

    for (const expected of cases) {
      const calls: RecordedCall[] = [];
      const db = makeStubDb({ responses: {}, calls });
      await loadEntityNames(db as never, expected.type, ["id-x"]);
      assert.equal(calls.length, 1, `expected one call for ${expected.type}`);
      assert.equal(calls[0]?.table, expected.table);
      assert.equal(calls[0]?.selectedNameColumn, expected.column);
    }
  });

  it("returns rows keyed by id", async () => {
    const calls: RecordedCall[] = [];
    const db = makeStubDb({
      responses: {
        catalog_brands: [
          { id: "b1", name: "Acme" },
          { id: "b2", name: "Widgets Co" },
        ],
      },
      calls,
    });

    const result = await loadEntityNames(db as never, "catalog_brand", [
      "b1",
      "b2",
    ]);

    assert.equal(result.size, 2);
    assert.equal(result.get("b1"), "Acme");
    assert.equal(result.get("b2"), "Widgets Co");
  });
});
