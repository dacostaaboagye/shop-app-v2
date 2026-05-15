import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

type PermissionInput = {
  locationId?: string;
  permission: string;
  scope?: "any_active" | "contextual";
  user: unknown;
};

type ServerOptions = NonNullable<Parameters<typeof createServer>[0]>;

describe("admin staff provisioning routes", () => {
  it("creates an internal staff user without exposing raw ids", async () => {
    let received: Record<string, unknown> | null = null;
    const permissionCalls: unknown[] = [];
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: {
          async createUser(actor, input) {
            received = { actor, input };
            return {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              requiresPasswordChange: true,
              roleAssignments: input.roleAssignments,
              setupInstruction:
                "Ask the user to open the sign-in page and use Forgot password to complete password setup.",
              slug: "store-worker",
              status: "active",
            };
          },
        },
        adminUserAccessQueryService: {
          async getUserAccessDetail() {
            return null;
          },
        },
        adminUserAccessWriteService: createNoopWriteService(),
      },
      permissionService: {
        async assertHasPermission(input) {
          permissionCalls.push(input);
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
        reason: "New warehouse hire",
        roleAssignments: [
          {
            locationSlug: "downtown-store",
            roleSlug: "worker",
          },
        ],
      },
      url: "/api/admin/access/users",
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().slug, "store-worker");
    assert.equal(response.json().requiresPasswordChange, true);
    assert.equal("id" in response.json(), false);
    assert.equal(
      (permissionCalls[0] as { permission?: string }).permission,
      "access.assignments.manage",
    );
    assert.deepEqual(received, {
      actor: {
        userId: "usr_123",
        userSlug: "store-manager",
      },
      input: {
        email: "worker@example.com",
        firstName: "Store",
        lastName: "Worker",
        reason: "New warehouse hire",
        roleAssignments: [
          {
            locationSlug: "downtown-store",
            roleSlug: "worker",
          },
        ],
      },
    });
  });

  it("rejects internal staff creation without authentication", async () => {
    let called = false;
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: {
          async createUser() {
            called = true;
            throw new Error("Unauthorized requests must not reach service");
          },
        },
        adminUserAccessQueryService: {
          async getUserAccessDetail() {
            return null;
          },
        },
        adminUserAccessWriteService: createNoopWriteService(),
      },
    });

    const response = await server.inject({
      method: "POST",
      payload: validCreateUserPayload(),
      url: "/api/admin/access/users",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(called, false);
  });

  it("rejects internal staff creation without access assignment permission", async () => {
    let called = false;
    const server = createAuthorizedServer({
      adminUserAccess: {
        adminStaffProvisioningService: {
          async createUser() {
            called = true;
            throw new Error("Forbidden requests must not reach service");
          },
        },
        adminUserAccessQueryService: {
          async getUserAccessDetail() {
            return null;
          },
        },
        adminUserAccessWriteService: createNoopWriteService(),
      },
      permissionService: {
        async assertHasPermission(input) {
          assert.equal(input.permission, "access.assignments.manage");
          throw new AppError({
            code: "forbidden",
            detail: "Forbidden in test.",
            statusCode: 403,
            title: "Forbidden",
          });
        },
      },
    });

    const response = await server.inject({
      headers: { authorization: `Bearer ${issueTestToken()}` },
      method: "POST",
      payload: validCreateUserPayload(),
      url: "/api/admin/access/users",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(called, false);
  });
});

function createAuthorizedServer(
  options: ServerOptions & {
    permissionService?: {
      assertHasPermission(input: PermissionInput): Promise<void>;
    };
  },
) {
  const { permissionService, ...serverOptions } = options;

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
            () => new Date("2026-04-09T12:00:00.000Z"),
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          if (permissionService) {
            await permissionService.assertHasPermission(input);
          }
        },
      },
    },
  });
}

function validCreateUserPayload() {
  return {
    email: "worker@example.com",
    firstName: "Store",
    lastName: "Worker",
    reason: "New warehouse hire",
    roleAssignments: [
      {
        locationSlug: "downtown-store",
        roleSlug: "worker",
      },
    ],
  };
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

function issueTestToken() {
  return issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-09T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
