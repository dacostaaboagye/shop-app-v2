import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogBrands,
  catalogCategories,
  type catalogProducts,
} from "@shop/database";
import { recordCategoryUpdate } from "../src/modules/catalog/catalog-category-change-log.js";
import {
  snapshotCategory,
  snapshotProduct,
  TRACKED_CATEGORY_FIELDS,
  TRACKED_PRODUCT_FIELDS,
} from "../src/modules/catalog/catalog-change-tracking.js";
import { recordProductUpdate } from "../src/modules/catalog/catalog-product-change-log.js";
import type { RecordCatalogChangeInput } from "../src/modules/catalog-change-log/catalog-change-log.types.js";
import type { CatalogChangeLogWriter } from "../src/modules/catalog-change-log/catalog-change-log-writer.js";

const PRODUCT_ID = "22222222-2222-4222-8222-222222222221";
const CATEGORY_ID = "33333333-3333-4333-8333-333333333331";
const OLD_CATEGORY_ID = "33333333-3333-4333-8333-333333333330";
const BRAND_ID = "44444444-4444-4444-8444-444444444441";
const OLD_BRAND_ID = "44444444-4444-4444-8444-444444444440";
const PARENT_CATEGORY_ID = "55555555-5555-4555-8555-555555555551";
const OLD_PARENT_CATEGORY_ID = "55555555-5555-4555-8555-555555555550";
const NOW = new Date("2026-05-02T10:00:00.000Z");

describe("catalog change tracking snapshots", () => {
  it("stores product category and brand as named referent objects", () => {
    const snapshot = snapshotProduct(makeProduct(), {
      brandName: "Cedar Thread",
      categoryName: "Travel Bags",
    });

    assert.equal(TRACKED_PRODUCT_FIELDS.includes("category"), true);
    assert.equal(TRACKED_PRODUCT_FIELDS.includes("brand"), true);
    assert.equal(
      (TRACKED_PRODUCT_FIELDS as readonly string[]).includes("categoryId"),
      false,
    );
    assert.equal(
      (TRACKED_PRODUCT_FIELDS as readonly string[]).includes("brandId"),
      false,
    );
    assert.deepEqual(snapshot.category, {
      id: CATEGORY_ID,
      name: "Travel Bags",
    });
    assert.deepEqual(snapshot.brand, { id: BRAND_ID, name: "Cedar Thread" });
    assert.equal("categoryId" in snapshot, false);
    assert.equal("brandId" in snapshot, false);
  });

  it("stores category parent as a named referent object", () => {
    const snapshot = snapshotCategory(makeCategory(), {
      parentCategoryName: "Bags",
    });

    assert.equal(TRACKED_CATEGORY_FIELDS.includes("parentCategory"), true);
    assert.equal(
      (TRACKED_CATEGORY_FIELDS as readonly string[]).includes(
        "parentCategoryId",
      ),
      false,
    );
    assert.deepEqual(snapshot.parentCategory, {
      id: PARENT_CATEGORY_ID,
      name: "Bags",
    });
    assert.equal("parentCategoryId" in snapshot, false);
  });

  it("records product category changes with id and name in the snapshot", async () => {
    const writer = new RecordingWriter();
    const before = makeProduct({ categoryId: OLD_CATEGORY_ID });
    const after = makeProduct();

    await recordProductUpdate(
      new SnapshotLookupDb() as never,
      writer,
      before,
      after,
      { actorId: "11111111-1111-4111-8111-111111111111", now: NOW },
    );

    assert.equal(writer.calls.length, 1);
    const call = writer.calls[0];
    assert.ok(call);
    assert.deepEqual(call.changedFields, ["category"]);
    assert.deepEqual(call.before?.category, {
      id: OLD_CATEGORY_ID,
      name: "Crossbody Bags",
    });
    assert.deepEqual(call.after?.category, {
      id: CATEGORY_ID,
      name: "Travel Bags",
    });
  });

  it("records product brand changes with id and name in the snapshot", async () => {
    const writer = new RecordingWriter();
    const before = makeProduct({ brandId: OLD_BRAND_ID });
    const after = makeProduct();

    await recordProductUpdate(
      new SnapshotLookupDb() as never,
      writer,
      before,
      after,
      { actorId: "11111111-1111-4111-8111-111111111111", now: NOW },
    );

    const call = writer.calls[0];
    assert.ok(call);
    assert.deepEqual(call.changedFields, ["brand"]);
    assert.deepEqual(call.before?.brand, {
      id: OLD_BRAND_ID,
      name: "Old Brand",
    });
    assert.deepEqual(call.after?.brand, {
      id: BRAND_ID,
      name: "Cedar Thread",
    });
  });

  it("records category parent changes with id and name in the snapshot", async () => {
    const writer = new RecordingWriter();
    const before = makeCategory({ parentCategoryId: OLD_PARENT_CATEGORY_ID });
    const after = makeCategory();

    await recordCategoryUpdate(
      new SnapshotLookupDb() as never,
      writer,
      before,
      after,
      { actorId: "11111111-1111-4111-8111-111111111111", now: NOW },
    );

    const call = writer.calls[0];
    assert.ok(call);
    assert.deepEqual(call.changedFields, ["parentCategory"]);
    assert.deepEqual(call.before?.parentCategory, {
      id: OLD_PARENT_CATEGORY_ID,
      name: "Accessories",
    });
    assert.deepEqual(call.after?.parentCategory, {
      id: PARENT_CATEGORY_ID,
      name: "Bags",
    });
  });
});

class RecordingWriter implements CatalogChangeLogWriter {
  readonly calls: RecordCatalogChangeInput[] = [];

  async record(_tx: unknown, input: RecordCatalogChangeInput): Promise<void> {
    this.calls.push(input);
  }
}

class SnapshotLookupDb {
  select(_shape: unknown) {
    return {
      from(table: unknown) {
        return {
          where() {
            if (table === catalogBrands) {
              return Promise.resolve([
                { id: OLD_BRAND_ID, name: "Old Brand" },
                { id: BRAND_ID, name: "Cedar Thread" },
              ]);
            }
            if (table !== catalogCategories) return Promise.resolve([]);
            return Promise.resolve([
              { id: OLD_CATEGORY_ID, name: "Crossbody Bags" },
              { id: CATEGORY_ID, name: "Travel Bags" },
              { id: OLD_PARENT_CATEGORY_ID, name: "Accessories" },
              { id: PARENT_CATEGORY_ID, name: "Bags" },
            ]);
          },
        };
      },
    };
  }
}

function makeProduct(
  overrides: Partial<typeof catalogProducts.$inferSelect> = {},
): typeof catalogProducts.$inferSelect {
  return {
    id: PRODUCT_ID,
    slug: "city-crossbody",
    name: "City Crossbody",
    description: "Compact daily carry.",
    categoryId: CATEGORY_ID,
    brandId: BRAND_ID,
    countryOfOrigin: "GH",
    isTaxable: true,
    taxCategory: null,
    priceIncludesTax: false,
    features: ["adjustable strap"],
    status: "active",
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
    ...overrides,
  };
}

function makeCategory(
  overrides: Partial<typeof catalogCategories.$inferSelect> = {},
): typeof catalogCategories.$inferSelect {
  return {
    id: CATEGORY_ID,
    slug: "travel-bags",
    name: "Travel Bags",
    description: null,
    parentCategoryId: PARENT_CATEGORY_ID,
    path: `${PARENT_CATEGORY_ID}/${CATEGORY_ID}`,
    status: "active",
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}
