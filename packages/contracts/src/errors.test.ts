import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { problemDetailsSchema } from "./errors.js";

describe("problemDetailsSchema", () => {
  it("accepts the shared backend error contract", () => {
    const parsed = problemDetailsSchema.parse({
      code: "internal_error",
      status: 500,
      title: "Internal Server Error",
      detail: "An unexpected error occurred.",
      requestId: "req_123",
      timestamp: new Date().toISOString(),
    });

    assert.equal(parsed.code, "internal_error");
  });
});
