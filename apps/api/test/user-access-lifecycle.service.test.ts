import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserAccessLifecycleService } from "../src/modules/auth/user-access-lifecycle.service.js";

describe("UserAccessLifecycleService", () => {
  it("deactivates the user and revokes all refresh tokens", async () => {
    const state = {
      deactivatedUserIds: [] as string[],
      revokedUsers: [] as string[],
    };
    const service = new UserAccessLifecycleService(
      {
        async deactivateUser(userId) {
          state.deactivatedUserIds.push(userId);
          return true;
        },
        async revokeRefreshTokensForUser(input) {
          state.revokedUsers.push(input.userId);
        },
      },
      () => new Date("2026-04-08T12:00:00.000Z"),
    );

    await service.deactivateUser("usr_123");

    assert.deepEqual(state.deactivatedUserIds, ["usr_123"]);
    assert.deepEqual(state.revokedUsers, ["usr_123"]);
  });
});
