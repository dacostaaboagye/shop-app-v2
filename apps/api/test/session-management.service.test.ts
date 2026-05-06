import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashRefreshToken } from "../src/modules/auth/session.service.js";
import {
  type SessionManagementRepository,
  SessionManagementService,
} from "../src/modules/auth/session-management.service.js";

describe("SessionManagementService", () => {
  it("lists active sessions with only safe metadata and marks the current one", async () => {
    const harness = createHarness();

    const result = await harness.service.listSessions({
      currentRefreshToken: "current-refresh-token",
      userId: "usr_123",
    });

    assert.deepEqual(result, {
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
    const [session] = result.sessions;

    assert.ok(session);
    assert.equal("id" in session, false);
  });

  it("revokes every active refresh token for logout-all", async () => {
    const harness = createHarness();

    await harness.service.logoutAll({
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      userId: "usr_123",
    });

    assert.deepEqual(harness.state.revocations, [
      { reason: "logout_all", userId: "usr_123" },
    ]);
    assert.deepEqual(harness.state.events, [
      {
        eventType: "logout",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        userId: "usr_123",
      },
    ]);
  });
});

function createHarness() {
  const state = {
    events: [] as Array<{
      eventType: "logout";
      ipAddress?: string;
      userAgent?: string;
      userId: string;
    }>,
    revocations: [] as Array<{ reason: string; userId: string }>,
  };
  const now = new Date("2026-04-08T12:00:00.000Z");
  const repository: SessionManagementRepository = {
    async listActiveRefreshTokensForUser() {
      return [
        {
          expiresAt: new Date("2026-04-15T12:00:00.000Z"),
          id: "rt_1",
          ipAddress: "127.0.0.1",
          issuedAt: now,
          tokenHash: hashRefreshToken("current-refresh-token"),
          userAgent: "test-agent",
        },
      ];
    },
    async recordAuthEvent(input) {
      state.events.push({
        eventType: input.eventType,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        userId: input.userId,
      });
    },
    async revokeRefreshTokensForUser(input) {
      state.revocations.push({
        reason: input.revokedReason,
        userId: input.userId,
      });
    },
  };

  return {
    service: new SessionManagementService(repository, () => now),
    state,
  };
}
