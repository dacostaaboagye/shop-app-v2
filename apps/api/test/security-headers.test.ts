import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer } from "../src/server/create-server.js";

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
