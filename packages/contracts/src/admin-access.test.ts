import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminAuditListResponseSchema,
  adminCreateRoleRequestSchema,
  adminPermissionListResponseSchema,
  adminRoleDetailSchema,
  adminRoleListQuerySchema,
} from "./admin-access.js";

describe("admin access contracts", () => {
  it("accepts a valid role list query", () => {
    const parsed = adminRoleListQuerySchema.parse({
      page: "2",
      pageSize: "20",
      q: "admin",
    });

    assert.equal(parsed.page, 2);
    assert.equal(parsed.pageSize, 20);
  });

  it("accepts a valid role detail payload", () => {
    const parsed = adminRoleDetailSchema.parse({
      assignedUserCount: 4,
      description: "Platform administrator role.",
      isSystem: true,
      name: "Admin",
      permissionCount: 3,
      permissions: [
        {
          assignedRoleCount: 2,
          description: "View admin home.",
          granted: true,
          key: "admin.dashboard.view",
        },
      ],
      slug: "admin",
    });

    assert.equal(parsed.permissions[0]?.granted, true);
  });

  it("accepts a valid create role request", () => {
    const parsed = adminCreateRoleRequestSchema.parse({
      description: "Regional operations oversight.",
      name: "Regional Ops",
      permissionKeys: ["orders.view", "deliveries.view"],
    });

    assert.equal(parsed.permissionKeys.length, 2);
  });

  it("accepts permission and audit list responses", () => {
    const permissions = adminPermissionListResponseSchema.parse({
      items: [
        {
          assignedRoleCount: 2,
          description: "View users.",
          key: "users.view",
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
    });
    const audit = adminAuditListResponseSchema.parse({
      items: [
        {
          action: "role_assigned",
          actorName: "Admin User",
          createdAt: "2026-04-09T12:00:00.000Z",
          locationName: "Downtown Store",
          overrideEffect: null,
          permissionKey: null,
          reason: "Assigned manager role",
          roleSlug: "manager",
          targetUserName: "Jane Smith",
        },
      ],
      page: 1,
      pageSize: 25,
      totalCount: 1,
    });

    assert.equal(permissions.items[0]?.key, "users.view");
    assert.equal(audit.items[0]?.roleSlug, "manager");
  });
});
