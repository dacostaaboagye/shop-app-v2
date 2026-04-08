import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { useAuthSessionStore } from "./use-auth-session-store";

describe("useAuthSessionStore", () => {
  it("stores and clears the current auth session in memory", () => {
    const store = useAuthSessionStore.getState();

    store.setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
      user: {
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

    assert.equal(useAuthSessionStore.getState().status, "authenticated");
    assert.equal(useAuthSessionStore.getState().accessToken, "a".repeat(64));

    useAuthSessionStore.getState().clearSession();

    assert.equal(useAuthSessionStore.getState().status, "anonymous");
    assert.equal(useAuthSessionStore.getState().accessToken, null);
  });
});
