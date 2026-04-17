import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPrimaryImageUrl,
  listPrimaryImageUrls,
} from "../src/modules/catalog/catalog-primary-image.loader.js";

describe("catalog primary image loader", () => {
  it("skips the database query when no entity slugs are provided", async () => {
    let queryCount = 0;
    const db = {
      query: {
        catalogMediaAssignments: {
          async findMany() {
            queryCount += 1;
            return [];
          },
        },
      },
    };

    const result = await listPrimaryImageUrls(db as never, "brand", []);

    assert.equal(result.size, 0);
    assert.equal(queryCount, 0);
  });

  it("returns primary image urls keyed by entity slug", async () => {
    const db = {
      query: {
        catalogMediaAssignments: {
          async findMany() {
            return [
              {
                asset: { publicUrl: "https://cdn.test/brand-a.png" },
                entitySlug: "brand-a",
              },
              {
                asset: { publicUrl: "https://cdn.test/brand-b.png" },
                entitySlug: "brand-b",
              },
              {
                asset: null,
                entitySlug: "brand-c",
              },
            ];
          },
        },
      },
    };

    const result = await listPrimaryImageUrls(db as never, "brand", [
      "brand-a",
      "brand-a",
      "brand-b",
      "brand-c",
    ]);

    assert.equal(result.get("brand-a"), "https://cdn.test/brand-a.png");
    assert.equal(result.get("brand-b"), "https://cdn.test/brand-b.png");
    assert.equal(result.has("brand-c"), false);
  });

  it("returns null when an entity has no primary image", async () => {
    const db = {
      query: {
        catalogMediaAssignments: {
          async findMany() {
            return [];
          },
        },
      },
    };

    const result = await getPrimaryImageUrl(db as never, "product", "widget-1");

    assert.equal(result, null);
  });
});
