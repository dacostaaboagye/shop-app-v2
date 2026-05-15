import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { createAdminUser } from "./admin-user-access";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("admin user access react-query wrappers", () => {
  it("posts internal staff creation requests with bearer auth", async () => {
    useAuthSessionStore.getState().setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-05-13T12:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "admin@example.com",
        emailVerified: true,
        firstName: "Admin",
        lastLoginAt: null,
        lastName: "User",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "admin-user",
        status: "active",
      },
    });
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://localhost:4000/api/admin/access/users",
      );
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        reason: "New hire",
        roleAssignments: [{ locationSlug: "accra", roleSlug: "worker" }],
      });

      return Response.json(
        {
          email: "worker@example.com",
          firstName: "Store",
          lastName: "Worker",
          requiresPasswordChange: true,
          roleAssignments: [{ locationSlug: "accra", roleSlug: "worker" }],
          setupInstruction: "Ask the user to use Forgot password.",
          slug: "store-worker",
          status: "active",
        },
        { status: 201 },
      );
    };

    const created = await createAdminUser({
      email: "worker@example.com",
      firstName: "Store",
      lastName: "Worker",
      reason: "New hire",
      roleAssignments: [{ locationSlug: "accra", roleSlug: "worker" }],
    });

    assert.equal(created.slug, "store-worker");
    assert.equal(created.requiresPasswordChange, true);
  });
});
