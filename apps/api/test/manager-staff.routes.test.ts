import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

type ServerOptions = NonNullable<Parameters<typeof createServer>[0]>;
type StockAssignmentDependencies = NonNullable<
  ServerOptions["stockAssignments"]
>;
type LocationStaffRows = Awaited<
  ReturnType<
    StockAssignmentDependencies["assignmentQueryRepository"]["getLocationStaff"]
  >
>;
describe("manager staff routes", () => {
  it("lists location staff for a manager-visible location", async () => {
    const state = {
      lastLocationId: "",
      lastPermissionScope: null as null | Record<string, unknown>,
    };
    const server = createAuthorizedServer({
      stockAssignments: {
        ...createStockAssignmentDependencies({
          async getLocationStaff(locationId: string) {
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
        }),
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
  it("creates a worker through the manager-scoped provisioning route", async () => {
    const state = {
      lastInput: null as null | Record<string, unknown>,
      lastPermissionScope: null as null | Record<string, unknown>,
    };
    const server = createAuthorizedServer({
      stockAssignments: {
        ...createStockAssignmentDependencies(),
        staffProvisioningService: {
          async createUser(actor, input, _now, policy) {
            state.lastInput = { actor, input, policy };
            return {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              requiresPasswordChange: true,
              roleAssignments: input.roleAssignments,
              setupInstruction:
                "Ask the user to open the sign-in page and use Forgot password to complete password setup.",
              slug: "new-worker",
              status: "active",
            };
          },
        },
      },
      permissionProbe: async (input) => {
        state.lastPermissionScope = input;
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        locationSlugs: ["downtown-store"],
        reason: "New floor worker",
      },
      url: "/api/manager/staff",
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().slug, "new-worker");
    assert.equal(response.json().requiresPasswordChange, true);
    assert.deepEqual(response.json().locationSlugs, ["downtown-store"]);
    assert.deepEqual(state.lastPermissionScope, {
      locationId: undefined,
      permission: "access.assignments.manage",
      scope: "any_active",
      user: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
    });
    assert.deepEqual(state.lastInput, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        reason: "New floor worker",
        roleAssignments: [
          {
            locationSlug: "downtown-store",
            roleSlug: "worker",
          },
        ],
      },
      policy: {
        actorRole: "manager",
        allowedRoleSlugs: ["worker"],
        locationPolicy: {
          permission: "access.assignments.manage",
          requireLocationAssignments: true,
        },
      },
    });
  });
  it("masks manager worker provisioning conflicts", async () => {
    const server = createAuthorizedServer({
      stockAssignments: {
        ...createStockAssignmentDependencies(),
        staffProvisioningService: {
          async createUser() {
            throw new AppError({
              code: "conflict",
              detail: "A user with this email already exists.",
              statusCode: 409,
              title: "Duplicate email",
            });
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        locationSlugs: ["downtown-store"],
        reason: "New floor worker",
      },
      url: "/api/manager/staff",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, "provisioning_failed");
    assert.match(response.json().detail, /Reference:/);
    assert.doesNotMatch(response.json().detail, /email already exists/i);
  });
  it("rejects manager worker creation without a location", async () => {
    const server = createAuthorizedServer({
      stockAssignments: {
        ...createStockAssignmentDependencies(),
        staffProvisioningService: {
          async createUser() {
            throw new Error("Invalid payloads must not reach the service");
          },
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        locationSlugs: [],
        reason: "New floor worker",
      },
      url: "/api/manager/staff",
    });

    assert.equal(response.statusCode, 400);
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
function createStockAssignmentDependencies(
  overrides: {
    getLocationStaff?: (locationId: string) => Promise<LocationStaffRows>;
  } = {},
): StockAssignmentDependencies {
  return {
    assignmentQueryRepository: {
      async getLocationAssignments() {
        return [];
      },
      async getLocationStaff(locationId: string) {
        return overrides.getLocationStaff?.(locationId) ?? [];
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
    handoverQueryRepository: {
      async getWorkerHandoverChain() {
        return null;
      },
      async listWorkerHandovers() {
        return [];
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
  };
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
