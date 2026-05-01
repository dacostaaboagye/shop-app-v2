import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import {
  type AuthRepository,
  type AuthUserRecord,
  type IssuedSession,
  PasswordAuthenticationService,
  type SessionIssuer,
} from "../src/modules/auth/authentication.service.js";
import { hashPassword } from "../src/modules/auth/password-hash.js";

const now = new Date("2026-04-08T12:00:00.000Z");

describe("PasswordAuthenticationService", () => {
  it("returns a session for a valid active user", async () => {
    const harness = createHarness({
      user: createUserRecord(),
    });

    const session = await harness.service.login({
      email: "manager@example.com",
      password: "Password123",
    });

    assert.equal(session.user.slug, "store-manager");
    assert.equal(harness.state.successfulLogins.length, 1);
    assert.equal(harness.state.lockoutsCleared.length, 1);
  });

  it("locks the account after the configured number of failures", async () => {
    const harness = createHarness({
      recentFailures: [
        new Date("2026-04-08T11:58:00.000Z"),
        new Date("2026-04-08T11:57:00.000Z"),
        new Date("2026-04-08T11:56:00.000Z"),
        new Date("2026-04-08T11:55:00.000Z"),
      ],
      user: createUserRecord(),
    });

    await assert.rejects(
      () =>
        harness.service.login({
          email: "manager@example.com",
          password: "WrongPassword1",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid credentials");
        return true;
      },
    );

    assert.equal(harness.state.lockoutsSet.length, 1);
    assert.equal(
      harness.state.events.filter((event) => event.eventType === "lockout")
        .length,
      1,
    );
  });

  it("blocks an already locked account", async () => {
    const harness = createHarness({
      user: createUserRecord({
        lockedUntil: new Date("2026-04-08T12:05:00.000Z"),
      }),
    });

    await assert.rejects(
      () =>
        harness.service.login({
          email: "manager@example.com",
          password: "Password123",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Account locked");
        assert.equal(error.details?.remainingLockoutSeconds, 300);
        return true;
      },
    );
  });

  it("rejects suspended accounts without issuing a session", async () => {
    const harness = createHarness({
      user: createUserRecord({
        status: "suspended",
      }),
    });

    await assert.rejects(
      () =>
        harness.service.login({
          email: "manager@example.com",
          password: "Password123",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Account unavailable");
        return true;
      },
    );

    assert.equal(harness.state.issuedSessions.length, 0);
  });

  it("does not record userId on failed_attempt events for known users", async () => {
    // Anti-enumeration: an operator browsing auth_events must not be able
    // to tell whether a failed login hit a real account or an unknown email.
    const harness = createHarness({
      user: createUserRecord(),
    });

    await assert.rejects(() =>
      harness.service.login({
        email: "manager@example.com",
        password: "WrongPassword1",
      }),
    );

    const failedAttempts = harness.state.events.filter(
      (event) => event.eventType === "failed_attempt",
    );
    assert.equal(failedAttempts.length, 1);
    assert.equal(failedAttempts[0]?.userId, undefined);
  });

  it("does not record userId on failed_attempt events for unknown emails", async () => {
    // Symmetric counterpart of the previous test: the unknown-email path
    // already omits userId; this pins the existing behavior so a refactor
    // can't reintroduce the asymmetry.
    const harness = createHarness({ user: null });

    await assert.rejects(() =>
      harness.service.login({
        email: "ghost@example.com",
        password: "Password123",
      }),
    );

    const failedAttempts = harness.state.events.filter(
      (event) => event.eventType === "failed_attempt",
    );
    assert.equal(failedAttempts.length, 1);
    assert.equal(failedAttempts[0]?.userId, undefined);
  });
});

function createHarness(input: {
  recentFailures?: Date[];
  user?: AuthUserRecord | null;
}) {
  const state = {
    events: [] as Array<{ eventType: string; userId?: string }>,
    issuedSessions: [] as IssuedSession[],
    lockoutsCleared: [] as string[],
    lockoutsSet: [] as Array<{ lockedUntil: Date; userId: string }>,
    loginAttempts: [] as Array<{ email: string; succeeded: boolean }>,
    successfulLogins: [] as Array<{ occurredAt: Date; userId: string }>,
  };

  const repository: AuthRepository = {
    async clearLockout(userId) {
      state.lockoutsCleared.push(userId);
    },
    async findUserByEmail() {
      return input.user ?? null;
    },
    async getRecentFailedAttemptTimes() {
      return input.recentFailures ?? [];
    },
    async markSuccessfulLogin(userId, occurredAt) {
      state.successfulLogins.push({ occurredAt, userId });
    },
    async recordAuthEvent(event) {
      state.events.push(event);
    },
    async recordLoginAttempt(attempt) {
      state.loginAttempts.push(attempt);
    },
    async setLockout(userId, lockedUntil) {
      state.lockoutsSet.push({ lockedUntil, userId });
    },
  };

  const sessionIssuer: SessionIssuer = {
    async issueSession(user) {
      const session = createSession(user);
      state.issuedSessions.push(session);
      return session;
    },
  };

  return {
    service: new PasswordAuthenticationService(
      repository,
      sessionIssuer,
      () => now,
    ),
    state,
  };
}

function createSession(user: AuthUserRecord): IssuedSession {
  return {
    accessToken: "a".repeat(64),
    accessTokenExpiresAt: new Date("2026-04-08T13:00:00.000Z").toISOString(),
    refreshToken: "b".repeat(64),
    refreshTokenExpiresAt: new Date("2026-04-15T12:00:00.000Z").toISOString(),
    user: {
      availablePortals: user.availablePortals,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
      notificationPreferences: user.notificationPreferences,
      primaryImageUrl: user.primaryImageUrl ?? null,
      preferredPortal: user.preferredPortal,
      requiresPasswordChange: user.requiresPasswordChange,
      slug: user.slug,
      status: user.status,
    },
  };
}

function createUserRecord(
  overrides: Partial<AuthUserRecord> = {},
): AuthUserRecord {
  return {
    availablePortals: ["admin"],
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
    passwordHash: hashPassword("Password123"),
    primaryImageUrl: null,
    preferredPortal: "admin",
    requiresPasswordChange: false,
    slug: "store-manager",
    status: "active",
    ...overrides,
  };
}
