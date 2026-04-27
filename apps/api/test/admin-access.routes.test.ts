import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin access routes", () => {
  it("authorizes the permissions catalogue with any active scope", async () => {
    const state = {
      scope: "contextual" as "any_active" | "contextual",
    };
    const server = createServer({
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
          async assertHasPermission(input) {
            state.scope = input.scope ?? "contextual";
          },
        },
      },
      adminAccess: {
        adminAccessQueryService: {
          async getRole() {
            return null;
          },
          async listAudit() {
            return { items: [], page: 1, pageSize: 10, totalCount: 0 };
          },
          async listPermissions() {
            return { items: [], page: 1, pageSize: 25, totalCount: 0 };
          },
          async listRoles() {
            return { items: [], page: 1, pageSize: 10, totalCount: 0 };
          },
        },
        adminAccessWriteService: {
          async createRole() {
            throw new Error("not used");
          },
          async updateRole() {
            throw new Error("not used");
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/access/permissions",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.scope, "any_active");
  });

  it("passes the authenticated actor through role create and update routes", async () => {
    const state = {
      created: null as null | Record<string, unknown>,
      updated: null as null | Record<string, unknown>,
    };
    const server = createServer({
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
      adminAccess: {
        adminAccessQueryService: {
          async getRole() {
            return null;
          },
          async listAudit() {
            return { items: [], page: 1, pageSize: 10, totalCount: 0 };
          },
          async listPermissions() {
            return { items: [], page: 1, pageSize: 25, totalCount: 0 };
          },
          async listRoles() {
            return { items: [], page: 1, pageSize: 10, totalCount: 0 };
          },
        },
        adminAccessWriteService: {
          async createRole(actor, input) {
            state.created = { actor, input };
            return roleDetail();
          },
          async updateRole(actor, slug, input) {
            state.updated = { actor, input, slug };
            return roleDetail();
          },
        },
      },
    });

    const authHeaders = { authorization: `Bearer ${issueTestToken()}` };
    const createResponse = await server.inject({
      body: {
        description: "Can reconcile operational access issues.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view"],
      },
      headers: authHeaders,
      method: "POST",
      url: "/api/admin/access/roles",
    });
    const updateResponse = await server.inject({
      body: {
        description: "Can reconcile operational access issues quickly.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view", "access.roles.view"],
      },
      headers: authHeaders,
      method: "PATCH",
      url: "/api/admin/access/roles/operations-reviewer",
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(updateResponse.statusCode, 200);
    assert.deepEqual(state.created, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        description: "Can reconcile operational access issues.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view"],
      },
    });
    assert.deepEqual(state.updated, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        description: "Can reconcile operational access issues quickly.",
        name: "Operations Reviewer",
        permissionKeys: ["access.audit.view", "access.roles.view"],
      },
      slug: "operations-reviewer",
    });
  });
});

function roleDetail() {
  return {
    assignedUserCount: 3,
    description: "Can reconcile operational access issues.",
    isSystem: false,
    name: "Operations Reviewer",
    permissionCount: 1,
    permissions: [
      {
        assignedRoleCount: 2,
        description: "View audit records.",
        granted: true,
        key: "access.audit.view",
      },
    ],
    slug: "operations-reviewer",
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
