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
});

function createProtectedServer(input: {
  now: Date;
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

  return server;
}
