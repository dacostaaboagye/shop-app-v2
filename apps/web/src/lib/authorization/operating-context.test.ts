import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthLocationPermissionScope } from "@shop/contracts";
import { resolveOperatingContext } from "./operating-context";

const LOCATION_SCOPES: AuthLocationPermissionScope[] = [
  {
    locationId: "11111111-1111-4111-8111-111111111111",
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    permissions: ["stock.view", "staff.view"],
  },
  {
    locationId: "22222222-2222-4222-8222-222222222222",
    locationName: "Airport Store",
    locationSlug: "airport-store",
    permissions: ["stock.view"],
  },
];

describe("resolveOperatingContext", () => {
  it("keeps admin global list contexts global", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "global" },
      urlLocationSlug: "downtown-store",
    });

    assert.equal(context.kind, "global");
    assert.equal(context.locationScope, null);
    assert.deepEqual(context.selectableLocationScopes, []);
  });

  it("uses the url location before the active location for scoped actions", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "location-required", permission: "stock.view" },
      urlLocationSlug: "downtown-store",
    });

    assert.equal(context.kind, "location");
    assert.equal(context.locationScope?.locationSlug, "downtown-store");
    assert.equal(context.selectableLocationScopes.length, 2);
  });

  it("falls back to the persisted active location when the url location is unavailable", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "location-required", permission: "stock.view" },
      urlLocationSlug: "missing-store",
    });

    assert.equal(context.kind, "location");
    assert.equal(context.locationScope?.locationSlug, "airport-store");
  });

  it("returns missing-location when a scoped action has no accessible location", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: null,
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "location-required", permission: "sales.manage" },
      urlLocationSlug: null,
    });

    assert.equal(context.kind, "missing-location");
    assert.equal(context.locationScope, null);
    assert.deepEqual(context.selectableLocationScopes, []);
  });

  it("allows optional location contexts to remain global by default", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: null,
      locationScopes: [],
      policy: { kind: "global-or-location", permission: "stock.view" },
      urlLocationSlug: null,
    });

    assert.equal(context.kind, "global");
    assert.equal(context.locationScope, null);
  });

  it("returns global context with all selectable scopes when manager has multiple locations and no location is selected", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "global-or-location", permission: "stock.view" },
      urlLocationSlug: null,
    });

    assert.equal(context.kind, "global");
    assert.equal(context.locationScope, null);
    assert.equal(context.selectableLocationScopes.length, 2);
  });

  it("uses only the explicit url location for optional list filters", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "global-or-location", permission: "stock.view" },
      urlLocationSlug: "downtown-store",
    });

    assert.equal(context.kind, "location");
    assert.equal(context.locationScope?.locationSlug, "downtown-store");
    assert.equal(context.selectableLocationScopes.length, 2);
  });

  it("keeps optional list contexts global when the url location is unavailable", () => {
    const context = resolveOperatingContext({
      activeLocationSlug: "airport-store",
      locationScopes: LOCATION_SCOPES,
      policy: { kind: "global-or-location", permission: "stock.view" },
      urlLocationSlug: "missing-store",
    });

    assert.equal(context.kind, "global");
    assert.equal(context.locationScope, null);
    assert.equal(context.selectableLocationScopes.length, 2);
  });
});
