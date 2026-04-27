import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type AuthRepository,
  type AuthUserRecord,
  PasswordAuthenticationService,
} from "../src/modules/auth/authentication.service.js";
import { hashPassword } from "../src/modules/auth/password-hash.js";
import {
  type SessionRepository,
  TokenSessionService,
} from "../src/modules/auth/session.service.js";

describe("auth load evidence", () => {
  it("issues unique tokens across 200 concurrent logins", async () => {
    const user = createUserRecord();
    const refreshTokenHashes: string[] = [];
    const authRepository: AuthRepository = {
      async clearLockout() {},
      async findUserByEmail() {
        return user;
      },
      async getRecentFailedAttemptTimes() {
        return [];
      },
      async markSuccessfulLogin() {},
      async recordAuthEvent() {},
      async recordLoginAttempt() {},
      async setLockout() {},
    };
    const sessionRepository: SessionRepository = {
      async createRefreshToken(input) {
        refreshTokenHashes.push(input.tokenHash);
      },
      async findRefreshTokenByHash() {
        return null;
      },
      async findUserById() {
        return user;
      },
      async recordAuthEvent() {},
      async revokeRefreshToken() {},
    };
    const sessionService = new TokenSessionService(sessionRepository, {
      accessTokenSecret: "development-access-secret",
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
    });
    const authenticationService = new PasswordAuthenticationService(
      authRepository,
      sessionService,
      () => new Date("2026-04-08T12:00:00.000Z"),
    );

    const sessions = await Promise.all(
      Array.from({ length: 200 }, () =>
        authenticationService.login({
          email: "manager@example.com",
          password: "Password123!",
        }),
      ),
    );

    assert.equal(
      new Set(sessions.map((session) => session.accessToken)).size,
      200,
    );
    assert.equal(
      new Set(sessions.map((session) => session.refreshToken)).size,
      200,
    );
    assert.equal(new Set(refreshTokenHashes).size, 200);
  });
});

function createUserRecord(): AuthUserRecord {
  return {
    availablePortals: [],
    email: "manager@example.com",
    emailVerified: false,
    firstName: "Store",
    id: "usr_123",
    lastLoginAt: null,
    lastName: "Manager",
    lockedUntil: null,
    notificationPreferences: {
      emailEnabled: true,
      inAppEnabled: true,
      soundEnabled: true,
    },
    passwordHash: hashPassword("Password123!"),
    primaryImageUrl: null,
    preferredPortal: null,
    requiresPasswordChange: false,
    slug: "store-manager-ab12",
    status: "active",
  };
}
