import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer } from "../src/server/create-server.js";

describe("health route", () => {
  it("returns a healthy status payload", async () => {
    const server = createServer();

    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    const payload = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(payload.name, "shop-app-v2-api");
    assert.equal(payload.status, "ok");
    assert.match(payload.utcTime, /\d{4}-\d{2}-\d{2}T/);
  });
});
