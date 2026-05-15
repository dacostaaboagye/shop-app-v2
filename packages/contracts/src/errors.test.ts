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

  it("accepts payload-too-large request errors", () => {
    const parsed = problemDetailsSchema.parse({
      code: "payload_too_large",
      detail: "The request payload is too large.",
      requestId: "req_123",
      status: 413,
      timestamp: new Date().toISOString(),
      title: "Payload Too Large",
    });

    assert.equal(parsed.code, "payload_too_large");
  });

  it("accepts rate limit problem details", () => {
    const parsed = problemDetailsSchema.parse({
      code: "rate_limited",
      status: 429,
      title: "Too Many Requests",
      detail: "Too many requests were received from this client.",
      requestId: "req_123",
      timestamp: new Date().toISOString(),
    });

    assert.equal(parsed.code, "rate_limited");
  });
});
