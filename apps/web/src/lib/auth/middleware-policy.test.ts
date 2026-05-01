import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLoginRedirectFromProtectedPath,
  isProtectedPath,
} from "./middleware-policy";

describe("isProtectedPath", () => {
  it("matches every portal prefix", () => {
    assert.equal(isProtectedPath("/admin"), true);
    assert.equal(isProtectedPath("/admin/dashboard"), true);
    assert.equal(isProtectedPath("/agent/incoming"), true);
    assert.equal(isProtectedPath("/manager/staff"), true);
    assert.equal(isProtectedPath("/supplier/orders"), true);
    assert.equal(isProtectedPath("/worker/today"), true);
  });

  it("does not match public auth paths", () => {
    assert.equal(isProtectedPath("/login"), false);
    assert.equal(isProtectedPath("/register"), false);
    assert.equal(isProtectedPath("/auth/callback"), false);
    assert.equal(isProtectedPath("/forgot-password"), false);
    assert.equal(isProtectedPath("/reset-password"), false);
  });

  it("does not match the root or marketing pages", () => {
    assert.equal(isProtectedPath("/"), false);
    assert.equal(isProtectedPath("/no-access"), false);
    assert.equal(isProtectedPath("/docs/api"), false);
  });

  it("does not match prefixes that only happen to start with a portal name", () => {
    assert.equal(isProtectedPath("/administrator"), false);
    assert.equal(isProtectedPath("/agentic-flow"), false);
  });
});

describe("buildLoginRedirectFromProtectedPath", () => {
  it("preserves the original path and query in the next param", () => {
    const url = buildLoginRedirectFromProtectedPath(
      "/admin/users",
      "?page=2",
      "https://shop.example.com/admin/users?page=2",
    );

    assert.equal(url.pathname, "/login");
    assert.equal(url.searchParams.get("next"), "/admin/users?page=2");
  });

  it("works without a query string", () => {
    const url = buildLoginRedirectFromProtectedPath(
      "/manager/staff",
      "",
      "https://shop.example.com/manager/staff",
    );

    assert.equal(url.searchParams.get("next"), "/manager/staff");
  });
});
