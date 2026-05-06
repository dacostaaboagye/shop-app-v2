import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterActiveLocationPermissionAssignments,
  filterActiveLocationScopes,
} from "../src/modules/access-control/postgres-permission.repository.js";

describe("PostgresPermissionRepository location-status filters", () => {
  it("keeps global grants while dropping inactive location-scoped grants", () => {
    const rows = filterActiveLocationPermissionAssignments([
      {
        effect: null,
        key: "users.manage",
        locationId: null,
        locationStatus: null,
        source: "role",
      },
      {
        effect: null,
        key: "inventory.read",
        locationId: "loc_active",
        locationStatus: "active",
        source: "role",
      },
      {
        effect: "allow",
        key: "inventory.write",
        locationId: "loc_inactive",
        locationStatus: "inactive",
        source: "override",
      },
    ]);

    assert.deepEqual(rows, [
      {
        effect: null,
        key: "users.manage",
        locationId: null,
        source: "role",
      },
      {
        effect: null,
        key: "inventory.read",
        locationId: "loc_active",
        source: "role",
      },
    ]);
  });

  it("drops inactive locations from resolved user location scopes", () => {
    const rows = filterActiveLocationScopes([
      {
        locationId: "loc_active",
        locationName: "Active Store",
        locationSlug: "active-store",
        locationStatus: "active",
      },
      {
        locationId: "loc_inactive",
        locationName: "Closed Store",
        locationSlug: "closed-store",
        locationStatus: "inactive",
      },
    ]);

    assert.deepEqual(rows, [
      {
        locationId: "loc_active",
        locationName: "Active Store",
        locationSlug: "active-store",
      },
    ]);
  });
});
