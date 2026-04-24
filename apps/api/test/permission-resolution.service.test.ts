import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { PermissionResolutionService } from "../src/modules/access-control/permission-resolution.service.js";

describe("PermissionResolutionService", () => {
  it("resolves active global role permissions", async () => {
    const service = createService([
      {
        effect: null,
        key: "inventory.read",
        locationId: null,
        source: "role",
      },
    ]);

    const permissions = await service.resolvePermissions({ userId: "usr_123" });

    assert.deepEqual(permissions, [
      {
        key: "inventory.read",
        source: "role",
      },
    ]);
  });

  it("applies deny overrides after role grants", async () => {
    const service = createService([
      {
        effect: null,
        key: "inventory.read",
        locationId: null,
        source: "role",
      },
      {
        effect: "deny",
        key: "inventory.read",
        locationId: null,
        source: "override",
      },
    ]);

    const permissions = await service.resolvePermissions({ userId: "usr_123" });

    assert.deepEqual(permissions, []);
  });

  it("supports allow overrides without a role grant", async () => {
    const service = createService([
      {
        effect: "allow",
        key: "users.manage",
        locationId: null,
        source: "override",
      },
    ]);

    const permissions = await service.resolvePermissions({ userId: "usr_123" });

    assert.deepEqual(permissions, [
      {
        key: "users.manage",
        source: "override",
      },
    ]);
  });

  it("includes location-scoped grants only for the matching location", async () => {
    const service = createService([
      {
        effect: null,
        key: "inventory.transfer",
        locationId: "loc_store_1",
        source: "role",
      },
    ]);

    const matchingPermissions = await service.resolvePermissions({
      locationId: "loc_store_1",
      userId: "usr_123",
    });
    const otherPermissions = await service.resolvePermissions({
      locationId: "loc_store_2",
      userId: "usr_123",
    });

    assert.equal(matchingPermissions.length, 1);
    assert.equal(otherPermissions.length, 0);
  });

  it("resolves navigation permissions across any active scope", async () => {
    const service = createService([
      {
        effect: null,
        key: "manager.dashboard.view",
        locationId: "loc_store_1",
        source: "role",
      },
      {
        effect: null,
        key: "access.permissions.view",
        locationId: "loc_store_1",
        source: "role",
      },
      {
        effect: "deny",
        key: "access.permissions.view",
        locationId: "loc_store_2",
        source: "override",
      },
    ]);

    const permissions = await service.resolvePermissionsForAnyScope({
      userId: "usr_123",
    });

    assert.deepEqual(
      permissions.map((permission) => permission.key),
      ["access.permissions.view", "manager.dashboard.view"],
    );
  });

  it("expands global permissions across all active operating locations", async () => {
    const service = createService(
      [
        {
          effect: null,
          key: "stock.view",
          locationId: null,
          source: "role",
        },
      ],
      {
        allLocationScopes: [
          {
            locationId: "loc_airport",
            locationName: "Airport Store",
            locationSlug: "airport-store",
          },
          {
            locationId: "loc_downtown",
            locationName: "Downtown Store",
            locationSlug: "downtown-store",
          },
        ],
      },
    );

    const result = await service.resolveAllPermissions({ userId: "usr_admin" });

    assert.deepEqual(
      result.locationScopes.map((scope) => ({
        locationId: scope.locationId,
        permissions: scope.permissions.map((permission) => permission.key),
      })),
      [
        { locationId: "loc_airport", permissions: ["stock.view"] },
        { locationId: "loc_downtown", permissions: ["stock.view"] },
      ],
    );
  });

  it("throws forbidden when the requested permission is missing", async () => {
    const service = createService([]);

    await assert.rejects(
      () =>
        service.assertHasPermission({
          permission: "inventory.read",
          user: { userId: "usr_123" },
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, "forbidden");
        assert.equal(error.title, "Forbidden");
        return true;
      },
    );
  });
});

function createService(
  assignments: Array<{
    effect: "allow" | "deny" | null;
    key: string;
    locationId: string | null;
    source: "override" | "role";
  }>,
  options: {
    activeLocationScopes?: Array<{
      locationId: string;
      locationName: string;
      locationSlug: string;
    }>;
    allLocationScopes?: Array<{
      locationId: string;
      locationName: string;
      locationSlug: string;
    }>;
  } = {},
) {
  return new PermissionResolutionService({
    async getAllActiveLocationScopes() {
      return options.allLocationScopes ?? [];
    },
    async getActiveLocationScopes() {
      return options.activeLocationScopes ?? [];
    },
    async getPermissionAssignments() {
      return assignments;
    },
  });
}
