import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldPlayNotificationSound } from "./notification-live-provider.support";

describe("notification live provider support", () => {
  it("plays sound only for in-app platform events when the user enables it", () => {
    assert.equal(
      shouldPlayNotificationSound({
        eventName: "platform-event",
        user: {
          availablePortals: ["worker"],
          email: "worker@example.com",
          emailVerified: true,
          firstName: "Worker",
          lastLoginAt: null,
          lastName: "User",
          notificationPreferences: {
            emailEnabled: true,
            inAppEnabled: true,
            soundEnabled: true,
          },
          preferredPortal: "worker",
          requiresPasswordChange: false,
          slug: "worker-user",
          status: "active",
        },
      }),
      true,
    );
  });

  it("suppresses sound when the user disables in-app or sound preferences", () => {
    assert.equal(
      shouldPlayNotificationSound({
        eventName: "platform-event",
        user: {
          availablePortals: ["worker"],
          email: "worker@example.com",
          emailVerified: true,
          firstName: "Worker",
          lastLoginAt: null,
          lastName: "User",
          notificationPreferences: {
            emailEnabled: true,
            inAppEnabled: false,
            soundEnabled: true,
          },
          preferredPortal: "worker",
          requiresPasswordChange: false,
          slug: "worker-user",
          status: "active",
        },
      }),
      false,
    );
  });
});
