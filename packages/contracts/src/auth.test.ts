import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authNotificationPreferencesSchema,
  authSessionSchema,
  loginRequestSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
} from "./auth.js";

describe("auth contracts", () => {
  it("accepts a valid login request", () => {
    const parsed = loginRequestSchema.parse({
      email: "manager@example.com",
      password: "Password123",
    });

    assert.equal(parsed.email, "manager@example.com");
  });

  it("accepts the shared auth session shape", () => {
    const parsed = authSessionSchema.parse({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: new Date().toISOString(),
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        emailVerified: true,
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

    assert.equal(parsed.user.slug, "store-manager");
  });

  it("accepts a valid registration request", () => {
    const parsed = registerRequestSchema.parse({
      email: "manager@example.com",
      firstName: "Store",
      lastName: "Manager",
      password: "Password123!",
    });

    assert.equal(parsed.firstName, "Store");
  });

  it("accepts notification preferences in the shared profile update contract", () => {
    const parsed = updateProfileRequestSchema.parse({
      firstName: "Store",
      lastName: "Manager",
      notificationPreferences: {
        emailEnabled: false,
        inAppEnabled: true,
        soundEnabled: false,
      },
    });

    assert.equal(parsed.firstName, "Store");
    assert.equal(parsed.lastName, "Manager");
    assert.deepEqual(parsed.notificationPreferences, {
      emailEnabled: false,
      inAppEnabled: true,
      soundEnabled: false,
    });
  });

  it("defaults missing notification preference fields", () => {
    const parsed = authNotificationPreferencesSchema.parse({});

    assert.deepEqual(parsed, {
      emailEnabled: true,
      inAppEnabled: true,
      soundEnabled: true,
    });
  });
});
