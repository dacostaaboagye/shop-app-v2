import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { AuthUserRecord } from "../src/modules/auth/authentication.service.js";
import {
  type SessionRepository,
  TokenSessionService,
} from "../src/modules/auth/session.service.js";

describe("TokenSessionService", () => {
  it("issues access and refresh tokens and stores the hashed refresh token", async () => {
    const harness = createSessionHarness();

    const session = await harness.service.issueSession(
      createUserRecord(),
      new Date("2026-04-08T12:00:00.000Z"),
    );

    assert.match(
      session.accessToken,
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    );
    assert.equal(harness.state.createdRefreshTokens.length, 1);
    assert.notEqual(
      harness.state.createdRefreshTokens[0]?.tokenHash,
      session.refreshToken,
    );
  });

  it("rotates a valid refresh token", async () => {
    const harness = createSessionHarness();
    const initialSession = await harness.service.issueSession(
      createUserRecord(),
      new Date("2026-04-08T12:00:00.000Z"),
    );

    const nextSession = await harness.service.refresh({
      refreshToken: initialSession.refreshToken,
    });

    assert.notEqual(nextSession.refreshToken, initialSession.refreshToken);
    assert.equal(harness.state.revocations.length, 1);
    assert.equal(harness.state.events.at(-1)?.eventType, "token_refresh");
  });

  for (const input of [
    {
      name: "deactivated users",
      reason: "user_unavailable",
      user: createUserRecord({ status: "deactivated" }),
    },
    {
      name: "locked users",
      reason: "account_locked",
      user: createUserRecord({
        lockedUntil: new Date("2026-04-08T12:05:00.000Z"),
      }),
    },
    {
      name: "users requiring password change",
      reason: "password_change_required",
      user: createUserRecord({ requiresPasswordChange: true }),
    },
  ] as const) {
    it(`rejects refresh for ${input.name} and revokes the presented token`, async () => {
      const harness = createSessionHarness({ user: input.user });
      const initialSession = await harness.service.issueSession(
        createUserRecord(),
        new Date("2026-04-08T12:00:00.000Z"),
      );

      await assert.rejects(
        () =>
          harness.service.refresh({
            refreshToken: initialSession.refreshToken,
          }),
        (error: unknown) => {
          assert.ok(error instanceof AppError);
          assert.equal(error.title, "Invalid session");
          return true;
        },
      );

      assert.deepEqual(harness.state.revocations, [
        { reason: input.reason, tokenId: "rt_1" },
      ]);
    });
  }

  it("rejects an invalid refresh token", async () => {
    const harness = createSessionHarness();

    await assert.rejects(
      () =>
        harness.service.refresh({
          refreshToken: "invalid-token",
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.title, "Invalid session");
        return true;
      },
    );
  });

  it("revokes the refresh token on logout and records an auth event", async () => {
    const harness = createSessionHarness();
    const session = await harness.service.issueSession(
      createUserRecord(),
      new Date("2026-04-08T12:00:00.000Z"),
    );

    await harness.service.logout({
      ipAddress: "127.0.0.1",
      refreshToken: session.refreshToken,
      userAgent: "test-agent",
    });

    assert.equal(harness.state.revocations.length, 1);
    const logoutEvent = harness.state.events.at(-1);

    assert.equal(logoutEvent?.eventType, "logout");
    assert.equal(logoutEvent?.ipAddress, "127.0.0.1");
    assert.equal(logoutEvent?.userAgent, "test-agent");
    assert.equal(logoutEvent?.userId, "usr_123");
    assert.ok(logoutEvent?.occurredAt instanceof Date);
  });
});

function createSessionHarness(input: { user?: AuthUserRecord | null } = {}) {
  const state = {
    createdRefreshTokens: [] as Array<{
      expiresAt: Date;
      id: string;
      tokenHash: string;
      userId: string;
    }>,
    events: [] as Array<{
      eventType: "logout" | "token_refresh";
      ipAddress?: string;
      occurredAt: Date;
      userAgent?: string;
      userId: string;
    }>,
    revocations: [] as Array<{ reason: string; tokenId: string }>,
  };

  const repository: SessionRepository = {
    async createRefreshToken(input) {
      state.createdRefreshTokens.push({
        expiresAt: input.expiresAt,
        id: `rt_${state.createdRefreshTokens.length + 1}`,
        tokenHash: input.tokenHash,
        userId: input.userId,
      });
    },
    async findRefreshTokenByHash(tokenHash) {
      const record = state.createdRefreshTokens.find(
        (candidate) => candidate.tokenHash === tokenHash,
      );

      return record
        ? {
            expiresAt: record.expiresAt,
            id: record.id,
            revokedAt: state.revocations.some(
              (revocation) => revocation.tokenId === record.id,
            )
              ? new Date("2026-04-08T12:30:00.000Z")
              : null,
            userId: record.userId,
          }
        : null;
    },
    async findUserById() {
      return "user" in input ? (input.user ?? null) : createUserRecord();
    },
    async recordAuthEvent(input) {
      state.events.push(input);
    },
    async revokeRefreshToken(input) {
      state.revocations.push({
        reason: input.revokedReason,
        tokenId: input.tokenId,
      });
    },
  };

  const fixedNow = new Date("2026-04-08T12:00:00.000Z");

  return {
    service: new TokenSessionService(
      repository,
      {
        accessTokenSecret: "development-access-secret",
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 604800,
      },
      () => fixedNow,
    ),
    state,
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
    passwordHash: "scrypt$unused$unused",
    primaryImageUrl: null,
    preferredPortal: "admin",
    requiresPasswordChange: false,
    slug: "store-manager",
    status: "active",
    ...overrides,
  };
}
