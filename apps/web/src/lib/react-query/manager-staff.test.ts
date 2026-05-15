import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { createManagerWorker } from "./manager-staff";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("manager staff react-query wrappers", () => {
  it("posts manager worker creation requests with bearer auth", async () => {
    useAuthSessionStore.getState().setSession({
      accessToken: "b".repeat(64),
      accessTokenExpiresAt: "2026-05-13T12:00:00.000Z",
      user: {
        availablePortals: ["manager"],
        email: "manager@example.com",
        emailVerified: true,
        firstName: "Manager",
        lastLoginAt: null,
        lastName: "User",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "manager",
        requiresPasswordChange: false,
        slug: "manager-user",
        status: "active",
      },
    });
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4000/api/manager/staff");
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"b".repeat(64)}`,
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        locationSlugs: ["accra"],
        reason: "New hire",
      });

      return Response.json(
        {
          email: "worker@example.com",
          firstName: "Store",
          lastName: "Worker",
          locationSlugs: ["accra"],
          requiresPasswordChange: true,
          setupInstruction: "Ask the worker to use Forgot password.",
          slug: "store-worker",
          status: "active",
        },
        { status: 201 },
      );
    };

    const created = await createManagerWorker({
      email: "worker@example.com",
      firstName: "Store",
      lastName: "Worker",
      locationSlugs: ["accra"],
      reason: "New hire",
    });

    assert.equal(created.slug, "store-worker");
  });
});
