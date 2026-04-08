import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDisplayErrorMessage } from "./problem-details";

describe("getDisplayErrorMessage", () => {
  it("returns a safe fallback when no structured problem is available", () => {
    assert.equal(
      getDisplayErrorMessage(null),
      "An unexpected error occurred. Please try again.",
    );
  });

  it("formats structured problem details for display", () => {
    assert.equal(
      getDisplayErrorMessage({
        code: "forbidden",
        status: 403,
        title: "Forbidden",
        detail: "You do not have access to this resource.",
        requestId: "req_123",
        timestamp: new Date().toISOString(),
      }),
      "Forbidden: You do not have access to this resource.",
    );
  });
});
