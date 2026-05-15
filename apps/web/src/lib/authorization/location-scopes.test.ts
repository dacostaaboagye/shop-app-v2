import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthLocationPermissionScope } from "@shop/contracts";
import {
  getPermissionLocationScopes,
  resolveActiveLocationScope,
  resolvePreferredLocationScope,
  resolveSelectedLocationScope,
} from "./location-scopes";

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

describe("location-scopes helpers", () => {
  it("filters location scopes by permission key", () => {
    const scopes = getPermissionLocationScopes(LOCATION_SCOPES, "staff.view");

    assert.deepEqual(scopes, [LOCATION_SCOPES[0]]);
  });

  it("falls back to the first accessible location when the slug is missing", () => {
    const selectedScope = resolveSelectedLocationScope(LOCATION_SCOPES, null);

    assert.deepEqual(selectedScope, LOCATION_SCOPES[0]);
  });

  it("returns the requested location when the slug matches an accessible scope", () => {
    const selectedScope = resolveSelectedLocationScope(
      LOCATION_SCOPES,
      "airport-store",
    );

    assert.deepEqual(selectedScope, LOCATION_SCOPES[1]);
  });

  it("uses the first accessible preferred location candidate", () => {
    const selectedScope = resolvePreferredLocationScope(LOCATION_SCOPES, [
      "missing-store",
      "airport-store",
      "downtown-store",
    ]);

    assert.deepEqual(selectedScope, LOCATION_SCOPES[1]);
  });

  it("uses the url location before the active store location", () => {
    const selectedScope = resolveActiveLocationScope({
      activeLocationSlug: "airport-store",
      scopes: LOCATION_SCOPES,
      urlLocationSlug: "downtown-store",
    });

    assert.deepEqual(selectedScope, LOCATION_SCOPES[0]);
  });

  it("uses the active store location when the url location is unavailable", () => {
    const selectedScope = resolveActiveLocationScope({
      activeLocationSlug: "airport-store",
      scopes: LOCATION_SCOPES,
      urlLocationSlug: "missing-store",
    });

    assert.deepEqual(selectedScope, LOCATION_SCOPES[1]);
  });
});
