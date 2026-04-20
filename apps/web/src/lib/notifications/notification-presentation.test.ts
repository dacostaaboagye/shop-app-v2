import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNotificationTimeLabel,
  getNotificationActorLabel,
  getNotificationEventLabel,
} from "./notification-presentation";

describe("notification presentation helpers", () => {
  it("formats relative time labels", () => {
    assert.match(
      formatNotificationTimeLabel(
        "2026-04-20T00:00:00.000Z",
        new Date("2026-04-20T00:30:00.000Z"),
      ),
      /30 minutes ago/i,
    );
  });

  it("maps transfer event types to operator-friendly labels", () => {
    assert.equal(getNotificationEventLabel("transfer.dispatched"), "In transit");
    assert.equal(getNotificationEventLabel("transfer.received"), "Received");
  });

  it("formats actor labels", () => {
    assert.equal(
      getNotificationActorLabel({
        actorUserSlug: "manager-a",
        eventType: "transfer.approved",
        notificationKey: "11111111-1111-4111-8111-111111111111",
        occurredAt: "2026-04-20T00:00:00.000Z",
        readAt: null,
        resource: {
          kind: "stock_transfer_request",
          reference: "SUP-0001",
        },
        status: "unread",
        summary: "SUP-0001 was approved.",
      }),
      "By manager-a",
    );
  });
});
