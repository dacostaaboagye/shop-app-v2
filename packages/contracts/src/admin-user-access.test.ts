import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminAssignUserRoleRequestSchema,
  adminSetUserPermissionOverrideRequestSchema,
  adminUpdateUserStatusRequestSchema,
  adminUserAccessDetailSchema,
} from "./admin-user-access.js";

describe("admin user access contracts", () => {
  it("accepts a valid admin user access detail payload", () => {
    const parsed = adminUserAccessDetailSchema.parse({
      assignedLocations: [
        {
          locationName: "Downtown Store",
          locationSlug: "downtown-store",
        },
      ],
      availablePortals: ["admin"],
      effectivePermissions: [
        {
          description: "View users.",
          key: "users.view",
          source: "role",
        },
      ],
      email: "admin@example.com",
      firstName: "Admin",
      lastLoginAt: "2026-04-09T12:00:00.000Z",
      lastName: "User",
      preferredPortal: "admin",
      recentActivity: [
        {
          eventType: "login",
          ipAddress: null,
          occurredAt: "2026-04-09T12:00:00.000Z",
          userAgent: null,
        },
      ],
      requiresPasswordChange: false,
      roleAssignments: [
        {
          assignedAt: "2026-04-09T09:00:00.000Z",
          assignedByName: "System Admin",
          locationName: null,
          locationSlug: null,
          roleName: "Admin",
          roleSlug: "admin",
        },
      ],
      slug: "admin-user",
      status: "active",
      userOverrides: [
        {
          createdAt: "2026-04-09T11:00:00.000Z",
          description: "Create stores and warehouses from the admin portal.",
          effect: "deny",
          locationName: null,
          locationSlug: null,
          permissionKey: "locations.create",
          reason: "Temporary freeze",
          setByName: "System Admin",
        },
      ],
    });

    assert.equal(parsed.slug, "admin-user");
    assert.equal(parsed.effectivePermissions[0]?.source, "role");
  });

  it("accepts role assignment, override, and status update requests", () => {
    const roleRequest = adminAssignUserRoleRequestSchema.parse({
      locationSlug: "downtown-store",
      reason: "Assigned to store operations",
      roleSlug: "manager",
    });
    const overrideRequest = adminSetUserPermissionOverrideRequestSchema.parse({
      effect: "deny",
      locationSlug: null,
      permissionKey: "locations.create",
      reason: "Block location creation",
    });
    const statusRequest = adminUpdateUserStatusRequestSchema.parse({
      reason: "Temporary compliance hold",
      status: "suspended",
    });

    assert.equal(roleRequest.roleSlug, "manager");
    assert.equal(overrideRequest.effect, "deny");
    assert.equal(statusRequest.status, "suspended");
  });
});
