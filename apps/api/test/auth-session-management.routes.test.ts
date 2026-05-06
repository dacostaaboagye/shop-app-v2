import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createUnavailableAuthDependencies } from "../src/modules/auth/auth-route-support.js";
import { refreshTokenCookieName } from "../src/modules/auth/refresh-token-cookie.js";
import { createServer } from "../src/server/create-server.js";

const now = new Date("2026-04-08T12:00:00.000Z");

describe("auth session management routes", () => {
  it("returns sanitized session inventory for the authenticated user", async () => {
    let receivedUserId = "";
    let receivedRefreshToken = "";
    const server = createSessionServer({
      sessionManagementService: {
        async listSessions(command) {
          receivedUserId = command.userId;
          receivedRefreshToken = command.currentRefreshToken ?? "";
          return {
            sessions: [
              {
                current: true,
                expiresAt: "2026-04-15T12:00:00.000Z",
                ipAddress: "127.0.0.1",
                issuedAt: "2026-04-08T12:00:00.000Z",
                userAgent: "test-agent",
              },
            ],
          };
        },
        async logoutAll() {
          throw new Error("logout-all should not be called");
        },
      },
    });

    const response = await server.inject({
      cookies: { [refreshTokenCookieName]: "cookie-refresh-token" },
      headers: { authorization: `Bearer ${accessToken()}` },
      method: "GET",
      url: "/api/auth/sessions",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(receivedUserId, "usr_123");
    assert.equal(receivedRefreshToken, "cookie-refresh-token");
    assert.deepEqual(response.json(), {
      sessions: [
        {
          current: true,
          expiresAt: "2026-04-15T12:00:00.000Z",
          ipAddress: "127.0.0.1",
          issuedAt: "2026-04-08T12:00:00.000Z",
          userAgent: "test-agent",
        },
      ],
    });
  });

  it("revokes all sessions for the authenticated user and clears the cookie", async () => {
    let receivedUserId = "";
    const server = createSessionServer({
      sessionManagementService: {
        async listSessions() {
          throw new Error("session inventory should not be called");
        },
        async logoutAll(command) {
          receivedUserId = command.userId;
        },
      },
    });

    const response = await server.inject({
      cookies: { [refreshTokenCookieName]: "cookie-refresh-token" },
      headers: { authorization: `Bearer ${accessToken()}` },
      method: "POST",
      url: "/api/auth/logout-all",
    });

    assert.equal(response.statusCode, 204);
    assert.equal(receivedUserId, "usr_123");
    assert.match(
      String(response.headers["set-cookie"]),
      new RegExp(`${refreshTokenCookieName}=;`),
    );
  });
});

function createSessionServer(input: {
  sessionManagementService: ReturnType<
    typeof createUnavailableAuthDependencies
  >["sessionManagementService"];
}) {
  return createServer({
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
                  requiresPasswordChange: false,
                  slug: "store-manager",
                  status: "active",
                };
              },
            },
            "development-access-secret",
            () => now,
          ).authenticate(token);
        },
      },
    },
    auth: {
      ...createUnavailableAuthDependencies(),
      sessionManagementService: input.sessionManagementService,
    },
  });
}

function accessToken(): string {
  return issueAccessToken({
    expiresInSeconds: 900,
    now,
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;
}
