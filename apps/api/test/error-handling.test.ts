import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { createServer } from "../src/server/create-server.js";

describe("error handling", () => {
  it("returns structured problem details for unknown routes", async () => {
    const server = createServer();
    const response = await server.inject({ method: "GET", url: "/missing" });

    const payload = response.json();

    assert.equal(response.statusCode, 404);
    assert.equal(payload.code, "not_found");
    assert.equal(payload.status, 404);
    assert.equal(payload.title, "Resource Not Found");
    assert.equal(payload.detail, "No route matched GET /missing.");
    assert.ok(payload.requestId);
  });

  it("returns generic 500 details for unexpected errors", async () => {
    const server = createServer();

    server.get(
      "/boom",
      { config: { access: { kind: "public" } } },
      async () => {
        throw new Error("database exploded");
      },
    );

    const response = await server.inject({ method: "GET", url: "/boom" });

    const payload = response.json();

    assert.equal(response.statusCode, 500);
    assert.equal(payload.code, "internal_error");
    assert.equal(payload.status, 500);
    assert.equal(payload.title, "Internal Server Error");
    assert.equal(payload.detail, "An unexpected error occurred.");
    assert.ok(payload.requestId);
  });

  it("preserves explicit domain errors", async () => {
    const server = createServer();

    server.get(
      "/conflict",
      { config: { access: { kind: "public" } } },
      async () => {
        throw new AppError({
          code: "conflict",
          detail: "The resource already exists.",
          statusCode: 409,
          title: "Conflict",
        });
      },
    );

    const response = await server.inject({ method: "GET", url: "/conflict" });

    const payload = response.json();

    assert.equal(response.statusCode, 409);
    assert.equal(payload.code, "conflict");
    assert.equal(payload.status, 409);
    assert.equal(payload.title, "Conflict");
    assert.equal(payload.detail, "The resource already exists.");
    assert.ok(payload.requestId);
  });

  it("returns structured problem details for oversized request bodies", async () => {
    const server = createServer();

    server.post(
      "/upload",
      { config: { access: { kind: "public" } } },
      async () => ({ ok: true }),
    );

    const response = await server.inject({
      method: "POST",
      payload: { body: "x".repeat(1_100_000) },
      url: "/upload",
    });

    const payload = response.json();

    assert.equal(response.statusCode, 413);
    assert.equal(payload.code, "payload_too_large");
    assert.equal(payload.status, 413);
    assert.equal(payload.title, "Payload Too Large");
    assert.ok(payload.requestId);
  });

  it("returns structured 503 details for database connectivity failures", async () => {
    const server = createServer();

    server.get(
      "/db-timeout",
      { config: { access: { kind: "public" } } },
      async () => {
        throw new Error("Connection terminated due to connection timeout");
      },
    );

    const response = await server.inject({
      method: "GET",
      url: "/db-timeout",
    });

    const payload = response.json();

    assert.equal(response.statusCode, 503);
    assert.equal(payload.code, "internal_error");
    assert.equal(payload.status, 503);
    assert.equal(payload.title, "Service Unavailable");
    assert.equal(
      payload.detail,
      "The service cannot reach the database right now. Please try again shortly.",
    );
    assert.ok(payload.requestId);
  });

  it("returns structured 503 details for wrapped database connectivity failures", async () => {
    const server = createServer();

    server.get(
      "/wrapped-db-timeout",
      { config: { access: { kind: "public" } } },
      async () => {
        throw new Error("Failed query: select * from users", {
          cause: new Error("Connection terminated unexpectedly"),
        });
      },
    );

    const response = await server.inject({
      method: "GET",
      url: "/wrapped-db-timeout",
    });

    const payload = response.json();

    assert.equal(response.statusCode, 503);
    assert.equal(payload.code, "internal_error");
    assert.equal(payload.status, 503);
    assert.equal(payload.title, "Service Unavailable");
  });
});
