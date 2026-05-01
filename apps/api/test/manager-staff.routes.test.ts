import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("manager staff routes", () => {
  it("lists location staff for a manager-visible location", async () => {
    const state = {
      lastLocationId: "",
      lastPermissionScope: null as null | Record<string, unknown>,
    };
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
                assignedAt: "2026-04-17T09:00:00.000Z" as unknown as Date,
                email: "worker@example.com",
                firstName: "Ama",
                lastName: "Mensah",
                lastSaleAt: "2026-04-18T11:00:00.000Z",
                locationName: "Downtown Store",
                netSalesAmount: "120.00",
                primaryImageUrl: "https://cdn.example.com/users/ama.jpg",
                roleName: "Worker",
                roleSlug: "worker" as const,
                returnsCount: 1,
                returnsTotalAmount: "15.00",
                salesCount: 3,
                salesTotalAmount: "135.00",
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
        assignmentCommandService: {
          async assignProduct() {
            throw new Error("not used");
          },
          async endHandover() {
            throw new Error("not used");
          },
          async initiateHandover() {
            throw new Error("not used");
          },
          async reassignProduct() {
            throw new Error("not used");
          },
        },
        permissionService: {
          async assertHasPermission() {
            throw new Error("not used");
          },
        },
        stockBalanceRepository: {
          async getOnHandQuantity() {
            throw new Error("not used");
          },
        },
      },
      permissionProbe: async (input) => {
        state.lastPermissionScope = input;
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
    assert.equal(response.json().items[0]?.salesCount, 3);
    assert.equal(response.json().items[0]?.netSalesAmount, "120.00");
    assert.equal(
      response.json().items[0]?.primaryImageUrl,
      "https://cdn.example.com/users/ama.jpg",
    );
    assert.equal(state.lastLocationId, "4181707d-c61e-4c22-995d-335295748060");
    assert.deepEqual(state.lastPermissionScope, {
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      permission: "staff.view",
      scope: "contextual",
      user: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
    });
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

function createAuthorizedServer(
  options: Parameters<typeof createServer>[0] & {
    permissionProbe?: (input: Record<string, unknown>) => Promise<void>;
  } = {},
) {
  const { permissionProbe, ...serverOptions } = options;
  return createServer({
    ...serverOptions,
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
        async assertHasPermission(input) {
          await permissionProbe?.({
            locationId: input.locationId,
            permission: input.permission,
            scope: input.scope,
            user: {
              userId: input.user.userId,
              userSlug: input.user.userSlug,
            },
          });
        },
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
