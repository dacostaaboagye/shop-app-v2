import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  fetchCurrentUser,
  fetchCurrentUserPermissions,
  updateCurrentUserProfile,
} from "./auth";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("auth react-query wrappers", () => {
  it("fetches the current authenticated user with the bearer token", async () => {
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

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/auth/me");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );

      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const user = await fetchCurrentUser();

    assert.equal(user.slug, "store-manager");
  });

  it("fetches the current user's effective permissions", async () => {
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

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://localhost:4000/api/auth/me/permissions",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );

      return new Response(
        JSON.stringify({
          locationScopes: [
            {
              locationId: "11111111-1111-4111-8111-111111111111",
              locationName: "Downtown Store",
              locationSlug: "downtown-store",
              permissions: ["inventory.read"],
            },
          ],
          permissions: ["inventory.read", "users.view"],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const permissionSet = await fetchCurrentUserPermissions();

    assert.deepEqual(permissionSet.permissions, [
      "inventory.read",
      "users.view",
    ]);
    assert.deepEqual(permissionSet.locationScopes, [
      {
        locationId: "11111111-1111-4111-8111-111111111111",
        locationName: "Downtown Store",
        locationSlug: "downtown-store",
        permissions: ["inventory.read"],
      },
    ]);
  });

  it("updates the current user profile with notification preferences", async () => {
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

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/auth/me");
      assert.equal(init?.method, "PATCH");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        notificationPreferences: {
          emailEnabled: false,
          inAppEnabled: true,
          soundEnabled: false,
        },
      });

      return new Response(null, { status: 204 });
    };

    await updateCurrentUserProfile({
      notificationPreferences: {
        emailEnabled: false,
        inAppEnabled: true,
        soundEnabled: false,
      },
    });
  });

  it("updates the current user profile with identity fields", async () => {
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

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/auth/me");
      assert.equal(init?.method, "PATCH");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        firstName: "Store",
        lastName: "Lead",
      });

      return new Response(null, { status: 204 });
    };

    await updateCurrentUserProfile({
      firstName: "Store",
      lastName: "Lead",
    });
  });
});
