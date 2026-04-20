import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { PlatformEventNotificationProjector } from "../src/modules/notifications/platform-event-notification-projector.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

describe("PlatformEventNotificationProjector", () => {
  it("creates unread notifications for direct and permission audiences", async () => {
    const created: Array<{ eventId: string; userIds: readonly string[] }> = [];
    const projector = new PlatformEventNotificationProjector({
      notificationRecipientRepository: {
        async filterActiveUserIds(userIds) {
          return [...userIds].filter((userId) => userId !== "inactive-user");
        },
        async listCandidateUserIdsWithPermission() {
          return ["manager-a", "manager-b"];
        },
      },
      permissionService: {
        async assertHasPermission(input) {
          if (input.user.userId === "manager-b") {
            throw forbidden();
          }
        },
      },
      userNotificationRepository: {
        async createUnreadNotifications(input) {
          created.push(input);
        },
      },
    });

    await projector.project(
      makeEvent({
        audience: [
          { kind: "user", userId: "worker-a" },
          { kind: "user", userId: "inactive-user" },
          {
            kind: "permission",
            locationId: "loc-a",
            permission: "stock.supply.manage",
          },
        ],
      }),
    );

    assert.deepEqual(created, [
      {
        eventId: "evt-1",
        userIds: ["manager-a", "worker-a"],
      },
    ]);
  });

  it("propagates non-forbidden permission failures", async () => {
    const projector = new PlatformEventNotificationProjector({
      notificationRecipientRepository: {
        async filterActiveUserIds(userIds) {
          return [...userIds];
        },
        async listCandidateUserIdsWithPermission() {
          return ["manager-a"];
        },
      },
      permissionService: {
        async assertHasPermission() {
          throw new Error("permission backend unavailable");
        },
      },
      userNotificationRepository: {
        async createUnreadNotifications() {},
      },
    });

    await assert.rejects(
      projector.project(
        makeEvent({
          audience: [{ kind: "permission", permission: "admin.dashboard.view" }],
        }),
      ),
      /permission backend unavailable/,
    );
  });
});

function makeEvent(overrides: Partial<PlatformEventRecord> = {}): PlatformEventRecord {
  return {
    actor: { userSlug: "worker-a" },
    audience: [{ kind: "user", userId: "worker-a" }],
    id: "evt-1",
    occurredAt: "2026-04-19T22:00:00.000Z",
    payload: { status: "pending" },
    resource: { kind: "stock_transfer_request", reference: "SUP-0001" },
    summary: "SUP-0001 changed.",
    type: "transfer.requested",
    ...overrides,
  };
}

function forbidden() {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access this route.",
    statusCode: 403,
    title: "Forbidden",
  });
}
