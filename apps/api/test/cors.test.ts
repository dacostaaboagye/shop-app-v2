import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "../src/server/create-server.js";

const ORIGINAL_WEB_BASE_URL = process.env.WEB_BASE_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function restoreEnv() {
  if (ORIGINAL_WEB_BASE_URL === undefined) {
    delete process.env.WEB_BASE_URL;
  } else {
    process.env.WEB_BASE_URL = ORIGINAL_WEB_BASE_URL;
  }

  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
}

describe("CORS policy", () => {
  beforeEach(() => {
    delete process.env.WEB_BASE_URL;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("allows the configured WEB_BASE_URL origin", async () => {
    process.env.WEB_BASE_URL = "https://web.example.com";
    process.env.NODE_ENV = "production";

    const server = createServer();
    const response = await server.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://web.example.com" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://web.example.com",
    );
    assert.equal(
      response.headers["access-control-expose-headers"],
      "Content-Disposition",
    );
  });

  it("rejects a foreign origin when WEB_BASE_URL is configured", async () => {
    process.env.WEB_BASE_URL = "https://web.example.com";
    process.env.NODE_ENV = "production";

    const server = createServer();
    const response = await server.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://attacker.example.com" },
    });

    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  it("does not echo arbitrary origins when WEB_BASE_URL is unset", async () => {
    // Production deployments fail-fast in index.ts when WEB_BASE_URL is
    // missing, but we still verify the server-level guard rejects browser
    // origins it cannot validate.
    process.env.NODE_ENV = "production";

    const server = createServer();
    const response = await server.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://attacker.example.com" },
    });

    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  it("allows non-browser callers without an Origin header", async () => {
    process.env.WEB_BASE_URL = "https://web.example.com";
    process.env.NODE_ENV = "production";

    const server = createServer();
    const response = await server.inject({ method: "GET", url: "/health" });

    assert.equal(response.statusCode, 200);
  });
});
