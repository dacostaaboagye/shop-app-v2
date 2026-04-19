import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("manager staff routes", () => {
  it("lists location staff for a manager-visible location", async () => {
    const state = { lastLocationId: "" };
    const server = createAuthorizedServer({
      stockAssignments: {
        assignmentQueryRepository: {
          async getLocationAssignments() {
            return [];
          },
          async getLocationStaff(locationId) {
            state.lastLocationId = locationId;
            return [
              {
                activeAssignmentCount: 4,
                assignedAt: new Date("2026-04-17T09:00:00.000Z"),
                email: "worker@example.com",
                firstName: "Ama",
                lastName: "Mensah",
                locationName: "Downtown Store",
                roleName: "Worker",
                roleSlug: "worker" as const,
                status: "active" as const,
                userId: "3a5e8d69-36cf-4b1f-a5ef-4ad3de7b2111",
                userSlug: "ama-mensah",
              },
            ];
          },
          async getWorkerAssignments() {
            return [];
          },
        },
        handoverRepository: {
          async getOriginalWorkerForChain() {
            return null;
          },
        },
        ownershipEventWriteService: {
          async assignProduct() {
            throw new Error("not used");
          },
          async reassignProduct() {
            throw new Error("not used");
          },
        },
        ownershipHandoverService: {
          async endHandover() {
            throw new Error("not used");
          },
          async initiateHandover() {
            throw new Error("not used");
          },
        },
        stockBalanceRepository: {
          async getOnHandQuantity() {
            throw new Error("not used");
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      query: {
        locationId: "4181707d-c61e-4c22-995d-335295748060",
      },
      url: "/api/manager/staff",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().locationName, "Downtown Store");
    assert.equal(response.json().items[0]?.roleSlug, "worker");
    assert.equal(
      state.lastLocationId,
      "4181707d-c61e-4c22-995d-335295748060",
    );
  });

  it("returns 503 when manager staff services are unavailable", async () => {
    const server = createAuthorizedServer();

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "GET",
      query: {
        locationId: "4181707d-c61e-4c22-995d-335295748060",
      },
      url: "/api/manager/staff",
    });

    assert.equal(response.statusCode, 503);
  });
});

function createAuthorizedServer(options: Parameters<typeof createServer>[0] = {}) {
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
            () => new Date("2026-04-17T12:00:00.000Z"),
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
    now: new Date("2026-04-17T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
