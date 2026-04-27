import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatNotificationTimeLabel,
  getNotificationActorLabel,
  getNotificationEventLabel,
  getNotificationPresentation,
  getNotificationStatusLabel,
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
    assert.equal(
      getNotificationEventLabel("transfer.dispatched"),
      "In transit",
    );
    assert.equal(getNotificationEventLabel("transfer.received"), "Received");
  });

  it("maps notification status labels to user-facing copy", () => {
    assert.equal(getNotificationStatusLabel("unread"), "Needs Attention");
    assert.equal(getNotificationStatusLabel("read"), "Read");
  });

  it("formats actor labels", () => {
    assert.equal(
      getNotificationActorLabel({
        actorUserSlug: "manager-a",
        eventType: "transfer.approved",
        notificationKey: "11111111-1111-4111-8111-111111111111",
        occurredAt: "2026-04-20T00:00:00.000Z",
        payload: {},
        readAt: null,
        resource: {
          kind: "stock_transfer_request",
          reference: "SUP-0001",
        },
        status: "unread",
        summary: "SUP-0001 was approved.",
      }),
      "By Manager A",
    );
  });

  it("builds descriptive transfer notification copy", () => {
    const presentation = getNotificationPresentation({
      actorUserSlug: "warehouse-manager",
      eventType: "transfer.dispatched",
      notificationKey: "11111111-1111-4111-8111-111111111111",
      occurredAt: "2026-04-20T00:00:00.000Z",
      payload: {
        approvedQuantity: 4,
        destinationLocationName: "Ablekuma Warehouse",
        gtnReference: "GTN-0001",
        sourceLocationName: "Main Warehouse",
      },
      readAt: null,
      resource: {
        kind: "stock_transfer_request",
        reference: "SUP-0001",
      },
      status: "unread",
      summary: "SUP-0001 was dispatched.",
    });

    assert.equal(presentation.title, "Supply request SUP-0001 is in transit");
    assert.equal(
      presentation.detail,
      "By Warehouse Manager dispatched 4 units from Main Warehouse to Ablekuma Warehouse under GTN GTN-0001.",
    );
  });

  it("shows admin communication message body in notification detail", () => {
    const presentation = getNotificationPresentation({
      actorUserSlug: "admin-user",
      eventType: "admin.communication.sent",
      notificationKey: "11111111-1111-4111-8111-111111111119",
      occurredAt: "2026-04-27T03:00:00.000Z",
      payload: {
        messageBody: "Please complete closing counts before you leave today.",
        subject: "Closing count reminder",
      },
      readAt: null,
      resource: {
        kind: "admin_communication",
        reference: "Closing count reminder",
      },
      status: "unread",
      summary: "Closing count reminder",
    });

    assert.equal(
      presentation.detail,
      "Please complete closing counts before you leave today.",
    );
    assert.equal(presentation.title, "Closing count reminder");
  });
});
