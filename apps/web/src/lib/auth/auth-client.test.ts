import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { login, logout, refreshAccessToken, register } from "./auth-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("auth-client", () => {
  it("registers with credentialed requests and stores the access token in memory", async () => {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/auth/register");
      assert.equal(init?.credentials, "include");
      assert.equal(init?.method, "POST");

      return new Response(
        JSON.stringify({
          accessToken: "a".repeat(64),
          accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
          user: {
            availablePortals: ["admin"],
            email: "manager@example.com",
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
    };

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const session = await register({
      email: "manager@example.com",
      firstName: "Store",
      lastName: "Manager",
      password: "Password123!",
    });

    assert.equal(session.user.slug, "store-manager");
    assert.equal(useAuthSessionStore.getState().accessToken, "a".repeat(64));
  });

  it("logs in with credentialed requests and stores the access token in memory", async () => {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/auth/login");
      assert.equal(init?.credentials, "include");
      assert.equal(init?.method, "POST");

      return new Response(
        JSON.stringify({
          accessToken: "a".repeat(64),
          accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
          user: {
            availablePortals: ["admin"],
            email: "manager@example.com",
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
    };

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    const session = await login({
      email: "manager@example.com",
      password: "Password123",
    });

    assert.equal(session.user.slug, "store-manager");
    assert.equal(useAuthSessionStore.getState().accessToken, "a".repeat(64));
  });

  it("returns null and clears memory when refresh is unauthorized", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "unauthorized",
          detail: "Refresh token cookie is missing or invalid.",
          requestId: "req_123",
          status: 401,
          timestamp: "2026-04-08T00:00:00.000Z",
          title: "Invalid session",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );

    useAuthSessionStore.getState().setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    const session = await refreshAccessToken();

    assert.equal(session, null);
    assert.equal(useAuthSessionStore.getState().status, "anonymous");
  });

  it("clears the in-memory session when logging out", async () => {
    globalThis.fetch = async () =>
      new Response(null, {
        status: 204,
      });

    useAuthSessionStore.getState().setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    await logout();

    assert.equal(useAuthSessionStore.getState().accessToken, null);
  });
});
