import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminLocationListQuerySchema,
  adminLocationListResponseSchema,
  adminLocationStaffListResponseSchema,
  adminStaffListQuerySchema,
  adminStaffListResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
} from "./admin.js";

describe("admin contracts", () => {
  it("accepts a valid admin user list query", () => {
    const parsed = adminUserListQuerySchema.parse({
      page: "2",
      pageSize: "20",
      q: "solomon",
      role: "regional_ops",
      sort: "createdAt",
      status: "active",
    });

    assert.equal(parsed.page, 2);
    assert.equal(parsed.pageSize, 20);
    assert.equal(parsed.role, "regional_ops");
  });

  it("accepts a valid admin user list response", () => {
    const parsed = adminUserListResponseSchema.parse({
      availableRoles: [
        { name: "Basic user", slug: "basic_user" },
        { name: "Regional Ops", slug: "regional_ops" },
      ],
      items: [
        {
          assignedLocations: [
            {
              name: "Downtown Store",
              slug: "downtown-store",
            },
          ],
          createdAt: "2026-04-09T10:00:00.000Z",
          email: "admin@example.com",
          firstName: "Admin",
          lastLoginAt: null,
          lastName: "User",
          preferredPortal: "admin",
          requiresPasswordChange: false,
          roles: [
            { name: "Basic user", slug: "basic_user" },
            { name: "Regional Ops", slug: "regional_ops" },
          ],
          slug: "admin-user",
          status: "active",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });

    assert.equal(parsed.items[0]?.roles[1]?.slug, "regional_ops");
  });

  it("accepts a valid admin staff list query", () => {
    const parsed = adminStaffListQuerySchema.parse({
      locationSlug: "ablekuma-warehouse",
      pageSize: "20",
      role: "manager",
      status: "active",
    });

    assert.equal(parsed.locationSlug, "ablekuma-warehouse");
    assert.equal(parsed.pageSize, 20);
    assert.equal(parsed.role, "manager");
  });

  it("accepts a valid admin staff list response", () => {
    const parsed = adminStaffListResponseSchema.parse({
      items: [
        {
          assignedLocations: [
            {
              name: "Ablekuma Warehouse",
              slug: "ablekuma-warehouse",
            },
          ],
          createdAt: "2026-04-09T10:00:00.000Z",
          email: "manager@example.com",
          firstName: "Warehouse",
          lastLoginAt: null,
          lastName: "Manager",
          preferredPortal: "manager",
          requiresPasswordChange: false,
          roles: [{ name: "Manager", slug: "manager" }],
          slug: "warehouse-manager",
          status: "active",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });

    assert.equal(parsed.items[0]?.roles[0]?.slug, "manager");
  });

  it("accepts a valid admin location list query", () => {
    const parsed = adminLocationListQuerySchema.parse({
      dir: "desc",
      pageSize: "5",
      q: "warehouse",
      status: "active",
      type: "warehouse",
    });

    assert.equal(parsed.pageSize, 5);
    assert.equal(parsed.dir, "desc");
  });

  it("accepts a valid admin location list response", () => {
    const parsed = adminLocationListResponseSchema.parse({
      items: [
        {
          createdAt: "2026-04-09T10:00:00.000Z",
          isFulfilmentEnabled: true,
          managers: [{ userSlug: "jane-smith", name: "Jane Smith" }],
          name: "Central Warehouse",
          slug: "central-warehouse",
          staffCount: 12,
          status: "active",
          type: "warehouse",
          zoneCount: 4,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    });

    assert.equal(parsed.items[0]?.zoneCount, 4);
  });

  it("accepts a valid admin location staff response", () => {
    const parsed = adminLocationStaffListResponseSchema.parse({
      items: [
        {
          activeAssignmentCount: 3,
          assignedAt: "2026-04-19T10:00:00.000Z",
          email: "worker@example.com",
          firstName: "Ama",
          lastName: "Mensah",
          primaryImageUrl: "https://cdn.example.com/users/ama.jpg",
          roleName: "Worker",
          roleSlug: "worker",
          status: "active",
          userSlug: "ama-mensah",
        },
      ],
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
    });

    assert.equal(parsed.items[0]?.activeAssignmentCount, 3);
    assert.equal(
      parsed.items[0]?.primaryImageUrl,
      "https://cdn.example.com/users/ama.jpg",
    );
  });
});
