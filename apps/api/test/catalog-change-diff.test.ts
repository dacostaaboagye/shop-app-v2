import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffSnapshot } from "../src/modules/catalog-change-log/catalog-change-diff.js";

type ProductLike = {
  name: string;
  description: string | null;
  status: "active" | "archived";
  isTaxable: boolean;
  features: string[];
  metadata: { color: string } | null;
};

const TRACKED: readonly (keyof ProductLike & string)[] = [
  "name",
  "description",
  "status",
  "isTaxable",
  "features",
  "metadata",
];

function buildProduct(overrides: Partial<ProductLike> = {}): ProductLike {
  return {
    name: "Rice 5kg",
    description: "Premium long grain",
    status: "active",
    isTaxable: true,
    features: ["aromatic", "premium"],
    metadata: { color: "white" },
    ...overrides,
  };
}

describe("diffSnapshot", () => {
  it("returns empty changedFields when before and after are identical", () => {
    const before = buildProduct();
    const after = buildProduct();
    const result = diffSnapshot(before, after, TRACKED);
    assert.deepEqual(result.changedFields, []);
    assert.deepEqual(result.before, {});
    assert.deepEqual(result.after, {});
  });

  it("captures a single primitive change", () => {
    const before = buildProduct({ name: "Rice 5kg" });
    const after = buildProduct({ name: "Premium Rice 5kg" });
    const result = diffSnapshot(before, after, TRACKED);
    assert.deepEqual(result.changedFields, ["name"]);
    assert.equal(result.before.name, "Rice 5kg");
    assert.equal(result.after.name, "Premium Rice 5kg");
  });

  it("captures multiple changes with stable ordering matching trackedFields", () => {
    const before = buildProduct();
    const after = buildProduct({
      status: "archived",
      isTaxable: false,
      name: "Rice 5kg (deprecated)",
    });
    const result = diffSnapshot(before, after, TRACKED);
    assert.deepEqual(result.changedFields, ["name", "status", "isTaxable"]);
  });

  it("treats null vs non-null as a change", () => {
    const before = buildProduct({ description: null });
    const after = buildProduct({ description: "Premium long grain" });
    const result = diffSnapshot(before, after, TRACKED);
    assert.deepEqual(result.changedFields, ["description"]);
    assert.equal(result.before.description, null);
    assert.equal(result.after.description, "Premium long grain");
  });

  it("structurally compares arrays — order and content sensitive", () => {
    const before = buildProduct({ features: ["aromatic", "premium"] });
    const after = buildProduct({ features: ["aromatic", "premium"] });
    assert.deepEqual(diffSnapshot(before, after, TRACKED).changedFields, []);

    const reordered = buildProduct({ features: ["premium", "aromatic"] });
    assert.deepEqual(diffSnapshot(before, reordered, TRACKED).changedFields, [
      "features",
    ]);

    const added = buildProduct({
      features: ["aromatic", "premium", "organic"],
    });
    assert.deepEqual(diffSnapshot(before, added, TRACKED).changedFields, [
      "features",
    ]);
  });

  it("structurally compares objects", () => {
    const before = buildProduct({ metadata: { color: "white" } });
    const same = buildProduct({ metadata: { color: "white" } });
    assert.deepEqual(diffSnapshot(before, same, TRACKED).changedFields, []);

    const different = buildProduct({ metadata: { color: "brown" } });
    assert.deepEqual(diffSnapshot(before, different, TRACKED).changedFields, [
      "metadata",
    ]);
  });

  it("ignores fields not in the tracked allowlist", () => {
    type Wider = ProductLike & { internalCounter: number };
    const tracked: readonly (keyof Wider & string)[] = TRACKED;
    const before: Wider = { ...buildProduct(), internalCounter: 0 };
    const after: Wider = {
      ...buildProduct({ name: "Renamed" }),
      internalCounter: 999,
    };
    const result = diffSnapshot<Wider>(before, after, tracked);
    assert.deepEqual(result.changedFields, ["name"]);
    assert.equal("internalCounter" in result.before, false);
  });

  it("treats Date instances as equal when their values match", () => {
    type Timed = { archivedAt: Date | null };
    const trackedDate: readonly (keyof Timed & string)[] = ["archivedAt"];
    const t1 = new Date("2026-05-01T10:00:00Z");
    const t2 = new Date("2026-05-01T10:00:00Z");
    const result = diffSnapshot<Timed>(
      { archivedAt: t1 },
      { archivedAt: t2 },
      trackedDate,
    );
    assert.deepEqual(result.changedFields, []);
  });
});
