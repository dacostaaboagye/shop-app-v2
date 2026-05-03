import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
  productVariants,
} from "@shop/database";
import { CatalogProductCommands } from "../src/modules/catalog/postgres-catalog-product-write.commands.js";
import type { RecordCatalogChangeInput } from "../src/modules/catalog-change-log/catalog-change-log.types.js";
import type { CatalogChangeLogWriter } from "../src/modules/catalog-change-log/catalog-change-log-writer.js";

const NOW = new Date("2026-05-02T10:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222221";
const VARIANT_1_ID = "33333333-3333-4333-8333-333333333331";
const VARIANT_2_ID = "33333333-3333-4333-8333-333333333332";

class RecordingWriter implements CatalogChangeLogWriter {
  readonly calls: RecordCatalogChangeInput[] = [];
  async record(_tx: unknown, input: RecordCatalogChangeInput): Promise<void> {
    this.calls.push(input);
  }
}

class ThrowingWriter implements CatalogChangeLogWriter {
  readonly error = new Error("simulated writer failure");
  async record(): Promise<void> {
    throw this.error;
  }
}

/**
 * Minimal in-memory drizzle-shaped fake. Tracks both "pending" rows (mutated
 * inside an in-flight transaction) and "committed" rows (only flushed when
 * the transaction callback resolves cleanly), so tests can assert that a
 * throwing writer rolls back the entity write.
 */
class FakeCatalogDb {
  productRows: Array<Record<string, unknown>> = [];
  variantRows: Array<Record<string, unknown>> = [];
  optionRows: Array<Record<string, unknown>> = [];
  optionValueRows: Array<Record<string, unknown>> = [];
  inTransaction = false;
  pending: {
    productRows: Array<Record<string, unknown>>;
    variantRows: Array<Record<string, unknown>>;
    optionRows: Array<Record<string, unknown>>;
    optionValueRows: Array<Record<string, unknown>>;
  } | null = null;

  // Drizzle relational query API stub. Only the shapes we exercise.
  query = {
    catalogProducts: {
      findFirst: async (_opts: unknown) => undefined as unknown,
    },
    productVariants: {
      findFirst: async (_opts: unknown) => undefined as unknown,
    },
    catalogProductOptions: {
      findFirst: async (_opts: unknown) => undefined as unknown,
    },
  };

  private rowsFor(table: unknown): Array<Record<string, unknown>> {
    const source = this.inTransaction ? this.pending : this;
    if (!source) throw new Error("transaction state missing");
    if (table === catalogProducts) return source.productRows;
    if (table === productVariants) return source.variantRows;
    if (table === catalogProductOptions) return source.optionRows;
    if (table === catalogProductOptionValues) return source.optionValueRows;
    throw new Error("unsupported table in fake");
  }

  async transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    this.pending = {
      productRows: this.productRows.map((r) => ({ ...r })),
      variantRows: this.variantRows.map((r) => ({ ...r })),
      optionRows: this.optionRows.map((r) => ({ ...r })),
      optionValueRows: this.optionValueRows.map((r) => ({ ...r })),
    };
    this.inTransaction = true;
    try {
      const result = await callback(this);
      // Commit on success.
      this.productRows = this.pending.productRows;
      this.variantRows = this.pending.variantRows;
      this.optionRows = this.pending.optionRows;
      this.optionValueRows = this.pending.optionValueRows;
      return result;
    } finally {
      this.inTransaction = false;
      this.pending = null;
    }
  }

  insert(table: unknown) {
    return {
      values: (payload: Record<string, unknown>) => ({
        returning: async () => {
          const row = { id: payload.id ?? `row-${Date.now()}`, ...payload };
          this.rowsFor(table).push(row);
          return [row];
        },
      }),
    };
  }

  update(table: unknown) {
    return {
      set: (changes: Record<string, unknown>) => ({
        where: (..._args: unknown[]) => {
          // Without parsing drizzle's where DSL, this fake updates all rows
          // for the table. The product `update` test uses a single product
          // row; the cascade test uses targeted variant rows. Tests avoid
          // setups where indiscriminate updates would mask bugs.
          const rows = this.rowsFor(table);
          const target = rows;
          for (const row of target) Object.assign(row, changes);
          const apiWithReturning = {
            returning: async () => target.map((row) => ({ ...row })),
          };
          // The `archiveActiveVariantsForProduct` helper awaits the where()
          // chain directly when no .returning() exists; some callers also
          // await the chain without .returning(). Make the chain
          // thenable-compatible.
          return Object.assign(
            Promise.resolve(target.map((row) => ({ ...row }))),
            apiWithReturning,
          );
        },
      }),
    };
  }

  select(_selection?: Record<string, unknown>) {
    type Thenable = Promise<unknown[]> & {
      limit: (n: number) => Promise<unknown[]>;
      orderBy: (...args: unknown[]) => Thenable;
      groupBy: (...args: unknown[]) => Thenable;
    };
    const thenable = (rows: unknown[]): Thenable => {
      const p = Promise.resolve(rows) as Thenable;
      p.limit = async (_n: number) => rows;
      p.orderBy = (..._a: unknown[]) => thenable(rows);
      p.groupBy = (..._a: unknown[]) => thenable(rows);
      return p;
    };
    const aggregateRow = [
      { brandSlug: null, categorySlug: null, variantCount: 0 },
    ];
    const snapshot = (table: unknown) =>
      this.rowsFor(table).map((row) => ({ ...row }));
    return {
      from: (table: unknown) => ({
        where: (..._args: unknown[]) => thenable(snapshot(table)),
        leftJoin: (..._args: unknown[]) => ({
          leftJoin: (..._a: unknown[]) => ({
            leftJoin: (..._b: unknown[]) => ({
              where: (..._c: unknown[]) => ({
                groupBy: (..._d: unknown[]) => thenable(aggregateRow),
              }),
            }),
          }),
        }),
        orderBy: (..._a: unknown[]) => thenable(snapshot(table)),
      }),
    };
  }

  delete(table: unknown) {
    return {
      where: (..._args: unknown[]) => {
        const rows = this.rowsFor(table);
        const removed = [...rows];
        rows.length = 0;
        return Object.assign(Promise.resolve({ rowCount: removed.length }), {
          returning: async () => removed,
        });
      },
    };
  }
}

const productSeed = {
  id: PRODUCT_ID,
  slug: "widget",
  name: "Widget",
  description: "A widget",
  categoryId: null,
  brandId: null,
  countryOfOrigin: null,
  isTaxable: true,
  taxCategory: null,
  priceIncludesTax: false,
  features: [] as string[],
  status: "active" as const,
  createdBy: ACTOR_ID,
  createdAt: NOW,
  updatedAt: NOW,
  archivedAt: null as Date | null,
};

const variantSeed = (overrides: Record<string, unknown>) => ({
  id: VARIANT_1_ID,
  productId: PRODUCT_ID,
  slug: "widget-v1",
  name: "Widget v1",
  sku: "WID-001",
  barcode: null,
  unitOfMeasure: "ea",
  costPrice: "1.00",
  sellingPrice: "2.00",
  attributes: {},
  weightGrams: null,
  dimensionsCm: null,
  packagingType: null,
  manufacturerPartNumber: null,
  customsCode: null,
  isTaxable: null,
  taxCategory: null,
  isDefault: false,
  status: "active" as const,
  createdBy: ACTOR_ID,
  createdAt: NOW,
  updatedAt: NOW,
  archivedAt: null,
  ...overrides,
});

function makeCommands(
  db: FakeCatalogDb,
  writer: CatalogChangeLogWriter,
): CatalogProductCommands {
  return new CatalogProductCommands(
    // biome-ignore lint/suspicious/noExplicitAny: minimal fake harness
    db as any,
    {
      allocateSlug: async ({ value }: { value: string }) =>
        value.toLowerCase().replace(/\s+/g, "-"),
    } as never,
    {
      assertCanDeleteProduct: async () => undefined,
      assertCanDeleteVariant: async () => undefined,
    } as never,
    writer,
  );
}

describe("Catalog change-log wire-up", () => {
  it("rolls back the product insert when the change-log writer throws (atomicity)", async () => {
    const db = new FakeCatalogDb();
    const writer = new ThrowingWriter();
    const commands = makeCommands(db, writer);

    await assert.rejects(
      commands.create({
        actorId: ACTOR_ID,
        now: NOW,
        payload: {
          name: "Widget",
          isTaxable: true,
          priceIncludesTax: false,
          status: "active",
        } as never,
      }),
      writer.error,
    );

    // No product row should be committed when the change-log write fails.
    assert.equal(db.productRows.length, 0);
  });

  it("emits one product-archived row plus one variant-archived row per cascaded variant, all sharing actorId + occurredAt (cascade)", async () => {
    const db = new FakeCatalogDb();
    db.productRows.push({ ...productSeed });
    db.variantRows.push(variantSeed({ id: VARIANT_1_ID, sku: "V1" }));
    db.variantRows.push(
      variantSeed({ id: VARIANT_2_ID, sku: "V2", slug: "widget-v2" }),
    );
    const writer = new RecordingWriter();
    const commands = makeCommands(db, writer);

    await commands.update({
      actorId: ACTOR_ID,
      now: NOW,
      slug: "widget",
      payload: { status: "archived" } as never,
    });

    assert.equal(writer.calls.length, 3);

    const productCall = writer.calls.find(
      (c) => c.entityType === "catalog_product",
    );
    const variantCalls = writer.calls.filter(
      (c) => c.entityType === "product_variant",
    );

    assert.ok(productCall);
    assert.equal(productCall.operation, "archived");
    assert.equal(variantCalls.length, 2);
    for (const call of variantCalls) {
      assert.equal(call.operation, "archived");
      assert.equal(call.parentEntityType, "catalog_product");
      assert.equal(call.parentEntityId, PRODUCT_ID);
    }

    // Cascade invariant: every emitted row carries the same actorId + occurredAt.
    const actorIds = new Set(writer.calls.map((c) => c.actorId));
    const occurredAt = new Set(
      writer.calls.map((c) => c.occurredAt.toISOString()),
    );
    assert.equal(actorIds.size, 1);
    assert.equal(occurredAt.size, 1);
    assert.equal(writer.calls[0]?.actorId, ACTOR_ID);
    assert.equal(writer.calls[0]?.occurredAt.toISOString(), NOW.toISOString());
  });

  it("does not emit a change-log row when an update produces no diff (no-op short-circuit)", async () => {
    const db = new FakeCatalogDb();
    db.productRows.push({ ...productSeed });
    const writer = new RecordingWriter();
    const commands = makeCommands(db, writer);

    // Payload mirrors current row exactly; updatedAt is bumped by the
    // command but is not a tracked field, so no diff fires.
    await commands.update({
      actorId: ACTOR_ID,
      now: NOW,
      slug: "widget",
      payload: {
        name: productSeed.name,
        isTaxable: productSeed.isTaxable,
        priceIncludesTax: productSeed.priceIncludesTax,
      } as never,
    });

    assert.equal(
      writer.calls.length,
      0,
      "update with no tracked-field changes must not record a change-log row",
    );
  });
});
