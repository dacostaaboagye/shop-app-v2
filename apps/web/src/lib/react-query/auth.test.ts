import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { fetchCurrentUser, fetchCurrentUserPermissions } from "./auth";

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
});
