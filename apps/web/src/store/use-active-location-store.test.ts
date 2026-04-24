import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeActiveLocationSlug,
  useActiveLocationStore,
} from "./use-active-location-store";

describe("useActiveLocationStore", () => {
  it("normalizes blank location slugs to null", () => {
    assert.equal(
      normalizeActiveLocationSlug(" ablekuma-warehouse "),
      "ablekuma-warehouse",
    );
    assert.equal(normalizeActiveLocationSlug("   "), null);
    assert.equal(normalizeActiveLocationSlug(null), null);
  });

  it("stores one selected location slug for shared scoped workflows", () => {
    const store = useActiveLocationStore.getState();

    store.setSelectedLocationSlug(" ablekuma-warehouse ");
    assert.equal(
      useActiveLocationStore.getState().selectedLocationSlug,
      "ablekuma-warehouse",
    );

    store.clearSelectedLocationSlug();
    assert.equal(useActiveLocationStore.getState().selectedLocationSlug, null);
  });
});
