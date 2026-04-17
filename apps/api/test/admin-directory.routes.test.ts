import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin directory routes", () => {
  it("lists users with backend-driven filters and pagination", async () => {
    const state = { lastQuery: null as null | Record<string, unknown> };
    const server = createAuthorizedServer({
      adminDirectory: {
        adminUserQueryService: {
          async listUsers(query) {
            state.lastQuery = query;
            return {
              availableRoles: [
                { name: "Admin", slug: "admin" },
                { name: "Regional Ops", slug: "regional_ops" },
              ],
              items: [
                {
                  assignedLocations: [],
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
                  status: "active" as const,
                },
              ],
              totalCount: 24,
            };
          },
        },
        adminLocationQueryService: {
          async listLocations() {
            return { items: [], totalCount: 0 };
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      query: {
        page: "2",
        pageSize: "20",
        q: "admin",
        role: "regional_ops",
        sort: "createdAt",
        status: "active",
      },
      url: "/api/admin/users",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().totalCount, 24);
    assert.deepEqual(state.lastQuery, {
      dir: "asc",
      locationSlug: "",
      page: 2,
      pageSize: 20,
      q: "admin",
      role: "regional_ops",
      sort: "createdAt",
      status: "active",
    });
  });

  it("lists locations with backend-driven filters and pagination", async () => {
    const state = { lastQuery: null as null | Record<string, unknown> };
    const server = createAuthorizedServer({
      adminDirectory: {
        adminUserQueryService: {
          async listUsers() {
            return { availableRoles: [], items: [], totalCount: 0 };
          },
        },
        adminLocationQueryService: {
          async listLocations(query) {
            state.lastQuery = query;
            return {
              items: [
                {
                  createdAt: "2026-04-09T10:00:00.000Z",
                  isFulfilmentEnabled: true,
                  managerName: "Jane Smith",
                  name: "Central Warehouse",
                  slug: "central-warehouse",
                  staffCount: 12,
                  status: "active" as const,
                  type: "warehouse" as const,
                  zoneCount: 4,
                },
              ],
              totalCount: 8,
            };
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      query: {
        dir: "desc",
        pageSize: "5",
        q: "warehouse",
        status: "active",
        type: "warehouse",
      },
      url: "/api/admin/locations",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0]?.zoneCount, 4);
    assert.deepEqual(state.lastQuery, {
      dir: "desc",
      page: 1,
      pageSize: 5,
      q: "warehouse",
      sort: "name",
      status: "active",
      type: "warehouse",
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

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-09T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
