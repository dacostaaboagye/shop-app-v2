import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("admin location query routes", () => {
  it("lists staff assigned to a location detail page", async () => {
    const state = { lastSlug: "" };
    const server = createAuthorizedServer({
      adminLocationQuery: {
        adminLocationQueryService: {
          async getLocation() {
            return null;
          },
          async listLocationStaff(slug) {
            state.lastSlug = slug;
            return {
              items: [
                {
                  activeAssignmentCount: 4,
                  assignedAt: "2026-04-19T10:00:00.000Z",
                  email: "worker@example.com",
                  firstName: "Ama",
                  lastName: "Mensah",
                  roleName: "Worker",
                  roleSlug: "worker" as const,
                  status: "active" as const,
                  userSlug: "ama-mensah",
                },
              ],
              locationName: "Downtown Store",
              locationSlug: "downtown-store",
            };
          },
          async listLocationZones() {
            return [];
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/locations/downtown-store/staff",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().locationName, "Downtown Store");
    assert.equal(response.json().items[0]?.userSlug, "ama-mensah");
    assert.equal(state.lastSlug, "downtown-store");
  });

  it("returns 404 when the location slug does not exist", async () => {
    const server = createAuthorizedServer({
      adminLocationQuery: {
        adminLocationQueryService: {
          async getLocation() {
            return null;
          },
          async listLocationStaff(slug) {
            return {
              items: [],
              locationName: null,
              locationSlug: slug,
            };
          },
          async listLocationZones() {
            return [];
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      url: "/api/admin/locations/missing-location/staff",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().title, "Location not found");
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
                  slug: "admin-user",
                  status: "active",
                };
              },
            },
            "development-access-secret",
            () => new Date("2026-04-19T12:00:00.000Z"),
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
    now: new Date("2026-04-19T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "admin-user",
  }).token;
}
