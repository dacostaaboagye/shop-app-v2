import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authSessionSchema,
  loginRequestSchema,
  registerRequestSchema,
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
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
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
});
