import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizePublicSnapshot } from "../src/modules/catalog-change-log/catalog-change-log-snapshot-presenter.js";

describe("sanitizePublicSnapshot", () => {
  it("strips referent IDs while preserving display names", () => {
    const result = sanitizePublicSnapshot({
      category: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Crossbody Bags",
      },
    });

    assert.deepEqual(result, {
      category: { name: "Crossbody Bags" },
    });
  });

  it("suppresses legacy UUID-only field values", () => {
    const result = sanitizePublicSnapshot({
      categoryId: "22222222-2222-4222-8222-222222222222",
    });

    assert.deepEqual(result, { categoryId: null });
  });

  it("recursively sanitizes arrays and nested objects", () => {
    const result = sanitizePublicSnapshot({
      changes: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Travel Bags",
        },
      ],
    });

    assert.deepEqual(result, {
      changes: [{ name: "Travel Bags" }],
    });
  });
});
