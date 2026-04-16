import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { getVariantStatusPatch } from "../src/modules/catalog/catalog-variant-write.support.js";

describe("getVariantStatusPatch", () => {
  it("archives variants by stamping archivedAt and clearing default", () => {
    const now = new Date("2026-04-11T10:00:00.000Z");

    assert.deepEqual(getVariantStatusPatch({ status: "archived" }, now), {
      archivedAt: now,
      isDefault: false,
    });
  });

  it("reactivates variants by clearing archivedAt", () => {
    const now = new Date("2026-04-11T10:00:00.000Z");

    assert.deepEqual(getVariantStatusPatch({ status: "active" }, now), {
      archivedAt: null,
      isDefault: undefined,
    });
  });

  it("rejects archived variants that are still marked as default", () => {
    assert.throws(
      () =>
        getVariantStatusPatch(
          { isDefault: true, status: "archived" },
          new Date("2026-04-11T10:00:00.000Z"),
        ),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.title === "Invalid variant state",
    );
  });
});
