import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "../src/server/create-server.js";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function restoreEnv() {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
}

describe("API security headers", () => {
  it("emits a strict CSP for JSON responses", async () => {
    const server = createServer();
    const response = await server.inject({ method: "GET", url: "/health" });
    const csp = response.headers["content-security-policy"];

    assert.equal(typeof csp, "string");
    assert.match(csp as string, /default-src 'none'/);
    assert.match(csp as string, /frame-ancestors 'none'/);
    assert.match(csp as string, /base-uri 'none'/);
  });

  it("sets a strict referrer policy", async () => {
    const server = createServer();
    const response = await server.inject({ method: "GET", url: "/health" });

    assert.equal(
      response.headers["referrer-policy"],
      "strict-origin-when-cross-origin",
    );
  });

  it("emits X-Content-Type-Options nosniff via Helmet defaults", async () => {
    const server = createServer();
    const response = await server.inject({ method: "GET", url: "/health" });

    assert.equal(response.headers["x-content-type-options"], "nosniff");
  });
});

describe("API rate limiting", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    restoreEnv();
  });

  it("applies a global backstop without breaking the problem-details contract", async () => {
    const server = createServer();
    let response = await server.inject({ method: "GET", url: "/health" });

    for (let requestNumber = 1; requestNumber <= 700; requestNumber += 1) {
      response = await server.inject({ method: "GET", url: "/health" });
      if (response.statusCode === 429) {
        break;
      }
    }

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers["retry-after"], "60");

    const payload = response.json();
    assert.equal(payload.status, 429);
    assert.equal(payload.code, "rate_limited");
    assert.equal(payload.title, "Too Many Requests");
  });
});
