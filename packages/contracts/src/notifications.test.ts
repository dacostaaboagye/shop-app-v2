import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  markAllNotificationsReadResponseSchema,
  markNotificationReadResponseSchema,
  notificationListQuerySchema,
  notificationListResponseSchema,
} from "./notifications.js";

describe("notifications contracts", () => {
  it("parses notification list query defaults", () => {
    const parsed = notificationListQuerySchema.parse({});

    assert.equal(parsed.limit, 12);
  });

  it("parses notification list responses", () => {
    const parsed = notificationListResponseSchema.parse({
      items: [
        {
          actorUserSlug: "manager-a",
          eventType: "transfer.dispatched",
          notificationKey: "11111111-1111-4111-8111-111111111111",
          occurredAt: "2026-04-19T23:00:00.000Z",
          readAt: null,
          resource: {
            kind: "stock_transfer_request",
            reference: "SUP-0001",
          },
          status: "unread",
          summary: "SUP-0001 was dispatched.",
        },
      ],
      unreadCount: 3,
    });

    assert.equal(parsed.items[0]?.resource.reference, "SUP-0001");
    assert.equal(parsed.unreadCount, 3);
  });

  it("parses mark-read responses", () => {
    const parsed = markNotificationReadResponseSchema.parse({
      notificationKey: "11111111-1111-4111-8111-111111111111",
      readAt: "2026-04-19T23:05:00.000Z",
      status: "read",
    });

    assert.equal(parsed.status, "read");
  });

  it("parses mark-all-read responses", () => {
    const parsed = markAllNotificationsReadResponseSchema.parse({
      updatedCount: 4,
    });

    assert.equal(parsed.updatedCount, 4);
  });
});
