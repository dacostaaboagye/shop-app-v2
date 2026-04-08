import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type {
  AuthUserRecord,
  IssuedSession,
} from "../src/modules/auth/authentication.service.js";
import {
  PasswordRegistrationService,
  type RegistrationRepository,
} from "../src/modules/auth/registration.service.js";

describe("PasswordRegistrationService", () => {
  it("creates a user and issues a session", async () => {
    const harness = createHarness({
      createUser: async (input) => ({
        status: "created",
        user: createUserRecord({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash: input.passwordHash,
          slug: input.slug,
        }),
      }),
    });

    const session = await harness.service.register({
      email: "manager@example.com",
      firstName: "Store",
      lastName: "Manager",
      password: "Password123!",
    });

    assert.equal(session.user.email, "manager@example.com");
    assert.equal(harness.state.issuedSessions.length, 1);
  });

  it("rejects duplicate email registration", async () => {
    const harness = createHarness({
      createUser: async () => ({ status: "email_conflict" }),
    });

    await assert.rejects(
      () =>
        harness.service.register({
          email: "manager@example.com",
          firstName: "Store",
          lastName: "Manager",
          password: "Password123!",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, "conflict");
        assert.equal(error.title, "Email already registered");
        return true;
      },
    );
  });
});

function createHarness(input: {
  createUser: RegistrationRepository["createUser"];
}) {
  const state = {
    issuedSessions: [] as IssuedSession[],
  };

  return {
    service: new PasswordRegistrationService(
      {
        createUser: input.createUser,
      },
      {
        async issueSession(user) {
          const session = createSession(user);
          state.issuedSessions.push(session);
          return session;
        },
      },
      () => new Date("2026-04-08T12:00:00.000Z"),
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
      email: user.email,
      firstName: user.firstName,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastName: user.lastName,
      preferredPortal: user.preferredPortal,
      requiresPasswordChange: user.requiresPasswordChange,
      slug: user.slug,
      status: user.status,
    },
  };
}

function createUserRecord(overrides: Partial<AuthUserRecord>): AuthUserRecord {
  return {
    email: "manager@example.com",
    firstName: "Store",
    id: "usr_123",
    lastLoginAt: null,
    lastName: "Manager",
    lockedUntil: null,
    passwordHash: "hash",
    preferredPortal: null,
    requiresPasswordChange: false,
    slug: "store-manager-ab12",
    status: "active",
    ...overrides,
  };
}
