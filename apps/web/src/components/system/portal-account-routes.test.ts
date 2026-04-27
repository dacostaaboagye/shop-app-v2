import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPortalAccountHref,
  getPortalKeyFromPathname,
} from "./portal-account-routes";

describe("portal account routes", () => {
  it("resolves the current portal key from the pathname", () => {
    assert.equal(getPortalKeyFromPathname("/worker/sales"), "worker");
    assert.equal(getPortalKeyFromPathname("/admin/account"), "admin");
    assert.equal(getPortalKeyFromPathname("/login"), null);
  });

  it("builds the account route from the current portal pathname", () => {
    assert.equal(
      getPortalAccountHref({
        pathname: "/manager/stock",
        user: null,
      }),
      "/manager/account",
    );
  });

  it("falls back to the user preference when the pathname is outside a portal", () => {
    assert.equal(
      getPortalAccountHref({
        pathname: "/",
        user: {
          availablePortals: ["worker"],
          preferredPortal: "worker",
        },
      }),
      "/worker/account",
    );
  });
});
