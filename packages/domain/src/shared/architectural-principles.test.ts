import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { architecturalPrinciples } from "./architectural-principles.js";

describe("architecturalPrinciples", () => {
  it("includes server-side authorization and immutable evidence", () => {
    assert.ok(
      architecturalPrinciples.includes(
        "Treat authorization as a server-side concern on every protected route",
      ),
    );
    assert.ok(
      architecturalPrinciples.includes("Keep immutable evidence immutable"),
    );
  });
});
