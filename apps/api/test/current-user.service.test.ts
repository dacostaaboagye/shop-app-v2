import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthUserRecord } from "../src/modules/auth/authentication.service.js";
import { CurrentUserService } from "../src/modules/auth/current-user.service.js";

describe("CurrentUserService", () => {
  it("passes identity fields through to the repository profile update", async () => {
    let receivedUserId = "";
    let receivedInput:
      | {
          firstName?: string;
          lastName?: string;
          preferredPortal?: string | null;
        }
      | undefined;

    const service = new CurrentUserService({
      async findUserById() {
        return activeUser();
      },
      async updateProfile(userId, input) {
        receivedUserId = userId;
        receivedInput = input;
      },
    });

    await service.updateProfile("usr_123", {
      firstName: "Store",
      lastName: "Lead",
    });

    assert.equal(receivedUserId, "usr_123");
    assert.deepEqual(receivedInput, {
      firstName: "Store",
      lastName: "Lead",
    });
  });

  it("normalizes preferred portal against the user's available portals", async () => {
    let receivedInput:
      | {
          preferredPortal?: string | null;
        }
      | undefined;

    const service = new CurrentUserService({
      async findUserById() {
        return activeUser();
      },
      async updateProfile(_userId, input) {
        receivedInput = input;
      },
    });

    await service.updateProfile("usr_123", {
      preferredPortal: "admin",
    });

    assert.deepEqual(receivedInput, {
      preferredPortal: "admin",
    });
  });
});

function activeUser(): AuthUserRecord {
  return {
    availablePortals: ["admin"],
    email: "manager@example.com",
    emailVerified: true,
    firstName: "Store",
    id: "usr_123",
    lastLoginAt: new Date("2026-04-26T12:00:00.000Z"),
    lastName: "Manager",
    lockedUntil: null,
    notificationPreferences: {
      emailEnabled: true,
      inAppEnabled: true,
      soundEnabled: true,
    },
    passwordHash: "hashed-password",
    primaryImageUrl: null,
    preferredPortal: "admin" as const,
    requiresPasswordChange: false,
    slug: "store-manager",
    status: "active" as const,
  };
}
