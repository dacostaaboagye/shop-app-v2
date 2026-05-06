import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin user access routes", () => {
  it("returns the user access detail payload", async () => {
    const state = { lastSlug: "" };
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: createNoopStaffProvisioningService(),
        adminUserAccessQueryService: {
          async getUserAccessDetail(slug) {
            state.lastSlug = slug;

            return {
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
                  locationName: null,
                  locationSlug: null,
                  source: "role" as const,
                },
              ],
              email: "admin@example.com",
              firstName: "Admin",
              lastLoginAt: "2026-04-09T12:00:00.000Z",
              lastName: "User",
              notificationPreferences: {
                emailEnabled: true,
                inAppEnabled: true,
                soundEnabled: true,
              },
              preferredPortal: "admin" as const,
              recentActivity: [],
              requiresPasswordChange: false,
              roleAssignments: [],
              slug: "admin-user",
              status: "active" as const,
              userOverrides: [],
            };
          },
        },
        adminUserAccessWriteService: createNoopWriteService(),
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/access/users/admin-user",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().slug, "admin-user");
    assert.equal(state.lastSlug, "admin-user");
  });

  it("parses role assignment, override, profile, and status commands", async () => {
    const state = {
      forceReset: null as null | Record<string, unknown>,
      profile: null as null | Record<string, unknown>,
      roleAssignment: null as null | Record<string, unknown>,
      status: null as null | Record<string, unknown>,
      override: null as null | Record<string, unknown>,
    };
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: createNoopStaffProvisioningService(),
        adminUserAccessQueryService: {
          async getUserAccessDetail() {
            return null;
          },
        },
        adminUserAccessWriteService: {
          async assignRole(actor, slug, input) {
            state.roleAssignment = { actor, input, slug };
          },
          async forcePasswordReset(actor, slug, input) {
            state.forceReset = { actor, input, slug };
          },
          async removePermissionOverride() {},
          async revokeRole() {},
          async setPermissionOverride(actor, slug, input) {
            state.override = { actor, input, slug };
          },
          async updateProfile(actor, slug, input) {
            state.profile = { actor, input, slug };
          },
          async updateStatus(actor, slug, input) {
            state.status = { actor, input, slug };
          },
        },
      },
    });

    const authHeaders = { authorization: `Bearer ${issueTestToken()}` };

    const [
      assignResponse,
      overrideResponse,
      profileResponse,
      statusResponse,
      resetResponse,
    ] = await Promise.all([
      server.inject({
        body: {
          locationSlug: "downtown-store",
          reason: "Assigned to downtown operations",
          roleSlug: "manager",
        },
        headers: authHeaders,
        method: "POST",
        url: "/api/admin/access/users/admin-user/roles",
      }),
      server.inject({
        body: {
          effect: "deny",
          locationSlug: null,
          permissionKey: "locations.create",
          reason: "Temporary freeze",
        },
        headers: authHeaders,
        method: "POST",
        url: "/api/admin/access/users/admin-user/permissions/override",
      }),
      server.inject({
        body: {
          email: "updated@example.com",
          firstName: "Updated",
          lastName: "User",
        },
        headers: authHeaders,
        method: "PATCH",
        url: "/api/admin/access/users/admin-user/profile",
      }),
      server.inject({
        body: {
          reason: "Compliance hold",
          status: "suspended",
        },
        headers: authHeaders,
        method: "PATCH",
        url: "/api/admin/access/users/admin-user/status",
      }),
      server.inject({
        body: {
          reason: "Security review",
        },
        headers: authHeaders,
        method: "POST",
        url: "/api/admin/access/users/admin-user/force-password-reset",
      }),
    ]);

    assert.equal(assignResponse.statusCode, 204);
    assert.equal(overrideResponse.statusCode, 204);
    assert.equal(profileResponse.statusCode, 204);
    assert.equal(statusResponse.statusCode, 204);
    assert.equal(resetResponse.statusCode, 204);
    assert.deepEqual(state.roleAssignment, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        locationSlug: "downtown-store",
        reason: "Assigned to downtown operations",
        roleSlug: "manager",
      },
      slug: "admin-user",
    });
    assert.deepEqual(state.override, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        effect: "deny",
        locationSlug: null,
        permissionKey: "locations.create",
        reason: "Temporary freeze",
      },
      slug: "admin-user",
    });
    assert.deepEqual(state.profile, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        email: "updated@example.com",
        firstName: "Updated",
        lastName: "User",
      },
      slug: "admin-user",
    });
    assert.deepEqual(state.status, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        reason: "Compliance hold",
        status: "suspended",
      },
      slug: "admin-user",
    });
    assert.deepEqual(state.forceReset, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        reason: "Security review",
      },
      slug: "admin-user",
    });
  });

  it("parses revoke and override removal commands", async () => {
    const state = {
      removeOverride: null as null | Record<string, unknown>,
      revokeRole: null as null | Record<string, unknown>,
    };
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: createNoopStaffProvisioningService(),
        adminUserAccessQueryService: {
          async getUserAccessDetail() {
            return null;
          },
        },
        adminUserAccessWriteService: {
          async assignRole() {},
          async forcePasswordReset() {},
          async removePermissionOverride(actor, slug, permissionKey, input) {
            state.removeOverride = { actor, input, permissionKey, slug };
          },
          async revokeRole(actor, slug, roleSlug, input) {
            state.revokeRole = { actor, input, roleSlug, slug };
          },
          async setPermissionOverride() {},
          async updateProfile() {},
          async updateStatus() {},
        },
      },
    });

    const authHeaders = { authorization: `Bearer ${issueTestToken()}` };
    const revokeResponse = await server.inject({
      body: {
        locationSlug: "downtown-store",
        reason: "Reassigned to another location",
      },
      headers: authHeaders,
      method: "DELETE",
      url: "/api/admin/access/users/admin-user/roles/manager",
    });
    const removeOverrideResponse = await server.inject({
      body: {
        locationSlug: null,
        reason: "Restriction lifted",
      },
      headers: authHeaders,
      method: "DELETE",
      url: "/api/admin/access/users/admin-user/permissions/override/locations.create",
    });

    assert.equal(revokeResponse.statusCode, 204);
    assert.equal(removeOverrideResponse.statusCode, 204);
    assert.deepEqual(state.revokeRole, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        locationSlug: "downtown-store",
        reason: "Reassigned to another location",
      },
      roleSlug: "manager",
      slug: "admin-user",
    });
    assert.deepEqual(state.removeOverride, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        locationSlug: null,
        reason: "Restriction lifted",
      },
      permissionKey: "locations.create",
      slug: "admin-user",
    });
  });
});

function createAuthorizedServer(options: Parameters<typeof createServer>[0]) {
  return createServer({
    ...options,
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
          const { AccessTokenAuthenticationService } = await import(
            "../src/modules/auth/access-token-authentication.service.js"
          );

          return new AccessTokenAuthenticationService(
            {
              async findUserById() {
                return {
                  id: "usr_123",
                  slug: "store-manager",
                  status: "active",
                };
              },
            },
            "development-access-secret",
            () => new Date("2026-04-09T12:00:00.000Z"),
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission() {},
      },
    },
  });
}

function createNoopWriteService() {
  return {
    async assignRole() {},
    async forcePasswordReset() {},
    async removePermissionOverride() {},
    async revokeRole() {},
    async setPermissionOverride() {},
    async updateProfile() {},
    async updateStatus() {},
  };
}

function createNoopStaffProvisioningService() {
  return {
    async createUser() {
      throw new Error("Unexpected staff provisioning call");
    },
  };
}

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-09T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
