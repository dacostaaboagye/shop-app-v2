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
});

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-09T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
