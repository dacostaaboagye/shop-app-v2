import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthUser } from "@shop/contracts";
import {
  buildLoginRedirectHref,
  normalizeSafeNextPath,
  resolvePostLoginHref,
} from "./auth-redirect";

const baseUser: AuthUser = {
  availablePortals: ["admin"],
  email: "admin@shop.local",
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
  primaryImageUrl: null,
  requiresPasswordChange: false,
  slug: "admin-user",
  status: "active",
};

describe("auth redirect helpers", () => {
  it("builds a login redirect for safe internal paths", () => {
    assert.equal(
      buildLoginRedirectHref("/docs/api"),
      "/login?next=%2Fdocs%2Fapi",
    );
  });

  it("rejects unsafe next paths", () => {
    assert.equal(normalizeSafeNextPath("https://evil.example"), null);
    assert.equal(normalizeSafeNextPath("//evil.example"), null);
  });

  it("prefers a safe next path after login", () => {
    assert.equal(resolvePostLoginHref(baseUser, "/docs/api"), "/docs/api");
  });

  it("falls back to the portal landing route when next is unsafe", () => {
    assert.equal(
      resolvePostLoginHref(baseUser, "https://evil.example"),
      "/admin",
    );
  });
});
