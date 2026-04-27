import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ApiError } from "@/lib/react-query/query-client";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  login,
  logout,
  refreshAccessToken,
  register,
  resendVerification,
} from "./auth-client";
import {
  createSessionResponse,
  createUnauthorizedResponse,
} from "./auth-client.test.support";

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
            emailVerified: false,
            firstName: "Store",
            lastLoginAt: null,
            lastName: "Manager",
            notificationPreferences: {
              emailEnabled: true,
              inAppEnabled: true,
              soundEnabled: true,
            },
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
            emailVerified: false,
            firstName: "Store",
            lastLoginAt: null,
            lastName: "Manager",
            notificationPreferences: {
              emailEnabled: true,
              inAppEnabled: true,
              soundEnabled: true,
            },
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
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        emailVerified: false,
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    const session = await refreshAccessToken();

    assert.equal(session, null);
    assert.equal(useAuthSessionStore.getState().status, "anonymous");
  });

  it("restores the previous session when refresh fails with a transient error", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "internal_error",
          detail: "Refresh temporarily failed.",
          requestId: "req_500",
          status: 503,
          timestamp: "2026-04-08T00:00:00.000Z",
          title: "Internal error",
        }),
        {
          status: 503,
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
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        emailVerified: false,
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    await assert.rejects(
      () => refreshAccessToken(),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 503);
        return true;
      },
    );

    assert.equal(useAuthSessionStore.getState().status, "authenticated");
    assert.equal(useAuthSessionStore.getState().accessToken, "a".repeat(64));
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
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        emailVerified: false,
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    await logout();

    assert.equal(useAuthSessionStore.getState().accessToken, null);
  });

  it("sends bearer auth when resending verification", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    useAuthSessionStore.getState().setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        emailVerified: false,
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://localhost:4000/api/auth/resend-verification",
      );
      assert.equal(init?.credentials, "include");
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );

      return new Response(null, { status: 204 });
    };

    await resendVerification();
  });

  it("refreshes and retries resend verification after a 401", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    let requestCount = 0;
    useAuthSessionStore.getState().setSession({
      accessToken: "expired-token",
      accessTokenExpiresAt: "2026-04-08T12:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        emailVerified: false,
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    });

    globalThis.fetch = async (input, init) => {
      requestCount += 1;

      if (requestCount === 1) {
        assert.equal(
          new Headers(init?.headers).get("Authorization"),
          "Bearer expired-token",
        );
        return createUnauthorizedResponse();
      }

      if (requestCount === 2) {
        assert.equal(String(input), "http://localhost:4000/api/auth/refresh");
        assert.equal(init?.credentials, "include");
        return createSessionResponse("b".repeat(64));
      }

      assert.equal(requestCount, 3);
      assert.equal(
        String(input),
        "http://localhost:4000/api/auth/resend-verification",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"b".repeat(64)}`,
      );
      return new Response(null, { status: 204 });
    };

    await resendVerification();

    assert.equal(requestCount, 3);
  });
});
