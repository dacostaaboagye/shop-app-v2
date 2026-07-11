import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUnavailableAuthDependencies } from "../src/modules/auth/auth-route-support.js";
import type { IssuedSession } from "../src/modules/auth/authentication.service.js";
import {
  refreshTokenCookieName,
  sessionFlagCookieName,
} from "../src/modules/auth/refresh-token-cookie.js";
import { createServer } from "../src/server/create-server.js";

// Audit M3: CSRF protection relies on SameSite=Strict + HttpOnly on the
// refresh cookie and on the refresh token staying scoped to /api/auth. A
// regression in any of these attributes silently reopens the CSRF surface,
// so this suite pins them at the set-cookie header level.
describe("refresh cookie attributes", () => {
  it("sets the refresh cookie with SameSite=Strict, HttpOnly, and the auth path", async () => {
    const cookies = await loginAndReadSetCookies();
    const refreshCookie = findCookie(cookies, refreshTokenCookieName);

    assert.match(refreshCookie, /; *SameSite=Strict/i);
    assert.match(refreshCookie, /; *HttpOnly/i);
    assert.match(refreshCookie, /; *Path=\/api\/auth/i);
  });

  it("sets the session flag cookie with SameSite=Strict and HttpOnly at site root", async () => {
    const cookies = await loginAndReadSetCookies();
    const flagCookie = findCookie(cookies, sessionFlagCookieName);

    assert.match(flagCookie, /; *SameSite=Strict/i);
    assert.match(flagCookie, /; *HttpOnly/i);
    assert.match(flagCookie, /; *Path=\//i);
  });

  it("never exposes the refresh token in the response body", async () => {
    const server = createLoginServer();
    const response = await server.inject({
      method: "POST",
      payload: { email: "manager@example.com", password: "Password123" },
      url: "/api/auth/login",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().refreshToken, undefined);
    assert.ok(!response.body.includes("b".repeat(64)));
  });
});

async function loginAndReadSetCookies(): Promise<string[]> {
  const server = createLoginServer();
  const response = await server.inject({
    method: "POST",
    payload: { email: "manager@example.com", password: "Password123" },
    url: "/api/auth/login",
  });

  assert.equal(response.statusCode, 200);
  const header = response.headers["set-cookie"];
  assert.ok(header, "expected set-cookie headers on login");
  return Array.isArray(header) ? header : [header];
}

function createLoginServer() {
  return createServer({
    auth: {
      ...createUnavailableAuthDependencies(),
      authenticationService: {
        async login(command) {
          return createSession(command.email);
        },
      },
    },
  });
}

function findCookie(cookies: string[], name: string): string {
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  assert.ok(match, `expected a ${name} set-cookie entry`);
  return match;
}

function createSession(email: string): IssuedSession {
  return {
    accessToken: "a".repeat(64),
    accessTokenExpiresAt: new Date("2026-04-08T13:00:00.000Z").toISOString(),
    refreshToken: "b".repeat(64),
    refreshTokenExpiresAt: new Date("2026-04-15T12:00:00.000Z").toISOString(),
    user: {
      availablePortals: ["admin"],
      email,
      emailVerified: false,
      firstName: "Store",
      lastLoginAt: null,
      lastName: "Manager",
      notificationPreferences: {
        emailEnabled: true,
        inAppEnabled: true,
        soundEnabled: true,
      },
      preferredPortal: "admin",
      requiresPasswordChange: false,
      slug: "store-manager",
      status: "active",
    },
  };
}
