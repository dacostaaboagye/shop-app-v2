import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAvailablePortals,
  getPortalLandingHref,
  getPortalSelectionState,
  getPreferredPortal,
  getPrimaryPortal,
} from "./portals";

describe("portals", () => {
  it("returns only valid available portals", () => {
    assert.deepEqual(
      getAvailablePortals({
        availablePortals: ["admin", "worker", "basic_user"] as never,
      }),
      ["admin", "worker"],
    );
  });

  it("ignores a preferred portal that is not in the available portal list", () => {
    assert.equal(
      getPreferredPortal({
        availablePortals: ["worker"],
        preferredPortal: "admin",
      }),
      null,
    );
  });

  it("returns the preferred portal when it is available", () => {
    assert.deepEqual(
      getPortalSelectionState({
        availablePortals: ["admin", "manager"],
        preferredPortal: "manager",
      }),
      {
        availablePortals: ["admin", "manager"],
        preferredPortal: "manager",
      },
    );
  });

  it("falls back to the first available portal when no preferred portal is set", () => {
    assert.equal(
      getPrimaryPortal({
        availablePortals: ["admin", "manager"],
        preferredPortal: null,
      }),
      "admin",
    );
  });

  it("prefills the landing location for worker portal redirects", () => {
    assert.equal(
      getPortalLandingHref({
        availablePortals: ["worker"],
        permissionSet: {
          locationScopes: [
            {
              locationId: "77f7b9a6-4f68-48cf-a16b-e34fb8f9e22c",
              locationName: "Downtown",
              locationSlug: "downtown-store",
              permissions: ["stock.assignments.own.view", "pos.sales.view"],
            },
          ],
          permissions: [],
        },
        preferredPortal: "worker",
      }),
      "/worker?location=downtown-store",
    );
  });

  it("does not add a location when the portal landing is global", () => {
    assert.equal(
      getPortalLandingHref({
        availablePortals: ["admin"],
        permissionSet: {
          locationScopes: [
            {
              locationId: "77f7b9a6-4f68-48cf-a16b-e34fb8f9e22c",
              locationName: "Downtown",
              locationSlug: "downtown-store",
              permissions: ["stock.view"],
            },
          ],
          permissions: [],
        },
        preferredPortal: "admin",
      }),
      "/admin",
    );
  });
});
