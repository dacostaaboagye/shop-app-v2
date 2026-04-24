import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NetworkError } from "@/lib/errors/app-error";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { fetchJson } from "./fetch-json";
import { ApiError } from "./query-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
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

  it("wraps transport failures in a retryable network error", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await assert.rejects(
      () => fetchJson("https://example.com"),
      (error: unknown) => {
        assert.ok(error instanceof NetworkError);
        assert.equal(
          error.message,
          "We could not reach the server. Check your connection and try again.",
        );
        return true;
      },
    );
  });

  it("refreshes once and retries authenticated requests after a 401", async () => {
    let requestCount = 0;

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      requestCount += 1;

      if (requestCount === 1) {
        assert.equal(init?.headers instanceof Headers, true);
        assert.equal(
          new Headers(init?.headers).get("Authorization"),
          "Bearer expired-token",
        );

        return new Response(
          JSON.stringify({
            code: "unauthorized",
            detail: "The access token is invalid or has expired.",
            requestId: "req_001",
            status: 401,
            timestamp: "2026-04-08T00:00:00.000Z",
            title: "Invalid access token",
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (requestCount === 2) {
        assert.equal(String(input), "http://localhost:4000/api/auth/refresh");
        assert.equal(init?.credentials, "include");

        return new Response(
          JSON.stringify({
            accessToken: "b".repeat(64),
            accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
            user: {
              availablePortals: ["admin"],
              email: "manager@example.com",
              emailVerified: false,
              firstName: "Store",
              lastLoginAt: null,
              lastName: "Manager",
              preferredPortal: "admin",
              requiresPasswordChange: false,
              slug: "store-manager",
              status: "active",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      assert.equal(requestCount, 3);
      assert.equal(String(input), "http://localhost:4000/protected");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"b".repeat(64)}`,
      );

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    useAuthSessionStore.getState().setSession({
      accessToken: "expired-token",
      accessTokenExpiresAt: "2026-04-08T12:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        preferredPortal: "admin",
        emailVerified: false,
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    const payload = await fetchJson<{ ok: boolean }>("/protected", undefined, {
      auth: "required",
    });

    assert.deepEqual(payload, { ok: true });
    assert.equal(useAuthSessionStore.getState().accessToken, "b".repeat(64));
  });
});
