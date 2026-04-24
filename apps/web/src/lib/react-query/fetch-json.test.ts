import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchJson } from "./fetch-json";
import { ApiError } from "./query-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchJson", () => {
  it("parses successful JSON responses", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const payload = await fetchJson<{ ok: boolean }>("https://example.com");

    assert.deepEqual(payload, { ok: true });
  });

  it("throws ApiError with shared problem details on failure", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "forbidden",
          detail: "You do not have access to this view.",
          requestId: "req_456",
          status: 403,
          timestamp: "2026-04-08T00:00:00.000Z",
          title: "Forbidden",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      );

    await assert.rejects(
      () => fetchJson("https://example.com"),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 403);
        assert.equal(
          error.message,
          "Forbidden: You do not have access to this view.",
        );
        return true;
      },
    );
  });
});
