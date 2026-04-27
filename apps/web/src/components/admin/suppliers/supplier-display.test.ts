import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSupplierDisplayName } from "./supplier-display";

describe("supplier display", () => {
  it("removes a repeated trailing slug from the display name", () => {
    assert.equal(
      formatSupplierDisplayName(
        "Solomon Aboagye (solomon-aboagye)",
        "solomon-aboagye",
      ),
      "Solomon Aboagye",
    );
  });

  it("keeps normal supplier names unchanged", () => {
    assert.equal(
      formatSupplierDisplayName("Acme Distribution", "acme-distribution"),
      "Acme Distribution",
    );
  });
});
