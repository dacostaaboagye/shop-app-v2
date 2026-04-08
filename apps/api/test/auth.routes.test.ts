import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IssuedSession } from "../src/modules/auth/authentication.service.js";
import { refreshTokenCookieName } from "../src/modules/auth/refresh-token-cookie.js";
import { createServer } from "../src/server/create-server.js";

describe("auth routes", () => {
  it("registers through the injected registration service and sets the refresh cookie", async () => {
    const server = createServer({
      auth: {
        authenticationService: {
          async login(command) {
            return createSession(command.email);
          },
        },
        logoutSessionService: {
          async logout() {},
        },
        refreshSessionService: {
          async refresh() {
            return createSession("manager@example.com");
          },
        },
        registrationService: {
          async register(command) {
            return createSession(command.email);
          },
        },
      },
    });

    const response = await server.inject({
      method: "POST",
      payload: {
        email: "manager@example.com",
        firstName: "Store",
        lastName: "Manager",
        password: "Password123!",
      },
      url: "/api/auth/register",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.email, "manager@example.com");
    assert.match(
      String(response.headers["set-cookie"]),
      new RegExp(`${refreshTokenCookieName}=`),
    );
  });

  it("logs in through the injected authentication service and sets the refresh cookie", async () => {
    const server = createServer({
      auth: {
        authenticationService: {
          async login(command) {
            return createSession(command.email);
          },
        },
        registrationService: {
          async register(command) {
            return createSession(command.email);
          },
        },
        logoutSessionService: {
          async logout() {},
        },
        refreshSessionService: {
          async refresh() {
            return createSession("manager@example.com");
          },
        },
      },
    });

    const response = await server.inject({
      method: "POST",
      payload: {
        email: "manager@example.com",
        password: "Password123",
      },
      url: "/api/auth/login",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.email, "manager@example.com");
    assert.equal(response.json().refreshToken, undefined);
    assert.match(
      String(response.headers["set-cookie"]),
      new RegExp(`${refreshTokenCookieName}=`),
    );
  });

  it("refreshes the session through the injected refresh service using the cookie token", async () => {
    const server = createServer({
      auth: {
        authenticationService: {
          async login(command) {
            return createSession(command.email);
          },
        },
        registrationService: {
          async register(command) {
            return createSession(command.email);
          },
        },
        logoutSessionService: {
          async logout() {},
        },
        refreshSessionService: {
          async refresh(command) {
            assert.equal(command.refreshToken, "cookie-refresh-token");
            return createSession("manager@example.com");
          },
        },
      },
    });

    const response = await server.inject({
      cookies: {
        [refreshTokenCookieName]: "cookie-refresh-token",
      },
      method: "POST",
      url: "/api/auth/refresh",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().user.slug, "store-manager");
    assert.equal(response.json().refreshToken, undefined);
    assert.match(
      String(response.headers["set-cookie"]),
      new RegExp(`${refreshTokenCookieName}=`),
    );
  });

  it("logs out through the injected logout service using the cookie token", async () => {
    let receivedRefreshToken = "";
    const server = createServer({
      auth: {
        authenticationService: {
          async login(command) {
            return createSession(command.email);
          },
        },
        registrationService: {
          async register(command) {
            return createSession(command.email);
          },
        },
        logoutSessionService: {
          async logout(command) {
            receivedRefreshToken = command.refreshToken;
          },
        },
        refreshSessionService: {
          async refresh() {
            return createSession("manager@example.com");
          },
        },
      },
    });

    const response = await server.inject({
      cookies: {
        [refreshTokenCookieName]: "cookie-refresh-token",
      },
      method: "POST",
      url: "/api/auth/logout",
    });

    assert.equal(response.statusCode, 204);
    assert.equal(receivedRefreshToken, "cookie-refresh-token");
    assert.match(
      String(response.headers["set-cookie"]),
      new RegExp(`${refreshTokenCookieName}=;`),
    );
  });

  it("returns 503 when auth services are not configured", async () => {
    const server = createServer();

    const response = await server.inject({
      method: "POST",
      payload: {
        email: "manager@example.com",
        password: "Password123",
      },
      url: "/api/auth/login",
    });

    assert.equal(response.statusCode, 503);
  });
});

function createSession(email: string): IssuedSession {
  return {
    accessToken: "a".repeat(64),
    accessTokenExpiresAt: new Date("2026-04-08T13:00:00.000Z").toISOString(),
    refreshToken: "b".repeat(64),
    refreshTokenExpiresAt: new Date("2026-04-15T12:00:00.000Z").toISOString(),
    user: {
      email,
      firstName: "Store",
      lastLoginAt: null,
      lastName: "Manager",
      preferredPortal: "admin",
      requiresPasswordChange: false,
      slug: "store-manager",
      status: "active",
    },
  };
}
