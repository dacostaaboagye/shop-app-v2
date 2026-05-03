import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

describe("route authorization", () => {
  it("allows authenticated routes with a valid active-user bearer token", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createProtectedServer({
      now,
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      url: "/protected",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      userId: "usr_123",
      userSlug: "store-manager",
    });
  });

  it("rejects protected routes without a bearer token", async () => {
    const server = createProtectedServer({
      now: new Date("2026-04-08T12:00:00.000Z"),
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/protected",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().title, "Authentication required");
  });

  it("rejects a deactivated user on the next protected request", async () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createProtectedServer({
      now,
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "deactivated",
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      url: "/protected",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().title, "Invalid access token");
  });

  it("rejects permission routes when the actor lacks the required permission", async () => {
    const server = createProtectedServer({
      now: new Date("2026-04-08T12:00:00.000Z"),
      permissionResult: "forbidden",
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now: new Date("2026-04-08T12:00:00.000Z"),
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      url: "/permission-protected",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
  });

  it("passes the resolved location scope to permission checks", async () => {
    const state = {
      locationId: "",
      scope: "contextual" as "any_active" | "contextual",
    };
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createProtectedServer({
      now,
      onPermissionCheck(input) {
        state.locationId = input.locationId ?? "";
        state.scope = input.scope ?? "contextual";
      },
      permissionResult: "allowed",
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
        "x-location-id": "loc_store_1",
      },
      method: "GET",
      url: "/permission-protected",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.locationId, "loc_store_1");
    assert.equal(state.scope, "contextual");
  });

  it("passes any-active scope to permission checks for scope-aware routes", async () => {
    const state = {
      scope: "contextual" as "any_active" | "contextual",
    };
    const now = new Date("2026-04-08T12:00:00.000Z");
    const server = createProtectedServer({
      now,
      onPermissionCheck(input) {
        state.scope = input.scope ?? "contextual";
      },
      permissionResult: "allowed",
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      headers: {
        authorization: `Bearer ${
          issueAccessToken({
            expiresInSeconds: 900,
            now,
            secret: "development-access-secret",
            userId: "usr_123",
            userSlug: "store-manager",
          }).token
        }`,
      },
      method: "GET",
      url: "/scope-any-protected",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.scope, "any_active");
  });

  it("fails closed when a matched route has no access metadata", async () => {
    const server = createProtectedServer({
      now: new Date("2026-04-08T12:00:00.000Z"),
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/missing-access-metadata",
    });

    assert.equal(response.statusCode, 500);
    assert.equal(response.json().title, "Route access metadata missing");
  });

  it("preserves normal 404 handling for unmatched routes", async () => {
    const server = createProtectedServer({
      now: new Date("2026-04-08T12:00:00.000Z"),
      user: {
        id: "usr_123",
        slug: "store-manager",
        status: "active",
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/route-does-not-exist",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().title, "Resource Not Found");
  });
});

function createProtectedServer(input: {
  onPermissionCheck?: (input: {
    locationId?: string;
    permission: string;
    scope?: "any_active" | "contextual";
  }) => void;
  now: Date;
  permissionResult?: "allowed" | "forbidden";
  user: {
    id: string;
    slug: string;
    status: "active" | "deactivated" | "suspended";
  } | null;
}) {
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
                return input.user;
              },
            },
            "development-access-secret",
            () => input.now,
          ).authenticate(token);
        },
      },
      permissionService: {
        async assertHasPermission(inputArgs) {
          input.onPermissionCheck?.({
            ...(inputArgs.locationId
              ? { locationId: inputArgs.locationId }
              : {}),
            permission: inputArgs.permission,
            ...(inputArgs.scope ? { scope: inputArgs.scope } : {}),
          });

          if (input.permissionResult === "forbidden") {
            const { AppError } = await import(
              "../src/modules/_core/errors/app-error.js"
            );

            throw new AppError({
              code: "forbidden",
              detail: "You do not have permission to access this route.",
              statusCode: 403,
              title: "Forbidden",
            });
          }
        },
      },
    },
  });

  server.route({
    config: { access: { kind: "authenticated" } },
    method: "GET",
    url: "/protected",
    async handler(request) {
      return {
        userId: request.auth?.userId,
        userSlug: request.auth?.userSlug,
      };
    },
  });

  server.route({
    config: {
      access: { kind: "permission", permission: "inventory.read" },
    },
    method: "GET",
    url: "/permission-protected",
    async handler() {
      return { ok: true };
    },
  });

  server.route({
    config: {
      access: {
        kind: "permission",
        permission: "inventory.read",
        scope: "any_active",
      },
    },
    method: "GET",
    url: "/scope-any-protected",
    async handler() {
      return { ok: true };
    },
  });

  server.route({
    method: "GET",
    url: "/missing-access-metadata",
    async handler() {
      return { ok: true };
    },
  });

  return server;
}
