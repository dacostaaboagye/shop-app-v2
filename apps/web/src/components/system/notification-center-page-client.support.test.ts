import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NotificationListItem } from "@shop/contracts";
import {
  buildNotificationEventOptions,
  buildNotificationResourceOptions,
  filterNotifications,
  hasActiveNotificationFilters,
} from "./notification-center-page-client.support";

const NOTIFICATIONS: NotificationListItem[] = [
  createNotification({
    actorUserSlug: "admin-user",
    eventType: "supplier.portal.invited",
    notificationKey: "11111111-1111-4111-8111-111111111111",
    occurredAt: "2026-04-26T08:00:00.000Z",
    resourceKind: "supplier_contact",
    resourceReference: "SUP-CON-001",
    status: "unread",
    summary: "Portal invite sent",
  }),
  createNotification({
    actorUserSlug: "manager-user",
    eventType: "transfer.approved",
    notificationKey: "22222222-2222-4222-8222-222222222222",
    occurredAt: "2026-04-24T10:00:00.000Z",
    resourceKind: "stock_transfer_request",
    resourceReference: "SR-00024",
    status: "read",
    summary: "Supply request approved",
  }),
  createNotification({
    actorUserSlug: "admin-user",
    eventType: "supplier.procurement.received",
    notificationKey: "33333333-3333-4333-8333-333333333333",
    occurredAt: "2026-04-20T12:00:00.000Z",
    resourceKind: "supplier_procurement_order",
    resourceReference: "PO-00009",
    status: "unread",
    summary: "Goods receipt recorded",
  }),
];

describe("notification center filtering", () => {
  it("filters by status, event type, resource kind, and search", () => {
    const result = filterNotifications(NOTIFICATIONS, {
      dateRange: undefined,
      eventType: "supplier.portal.invited",
      resourceKind: "supplier_contact",
      search: "portal invite",
      status: "unread",
    });

    assert.deepEqual(
      result.map((item) => item.notificationKey),
      ["11111111-1111-4111-8111-111111111111"],
    );
  });

  it("matches search across summary and reference with trimmed case-insensitive text", () => {
    const byReference = filterNotifications(NOTIFICATIONS, {
      dateRange: undefined,
      eventType: "",
      resourceKind: "",
      search: "  po-00009 ",
      status: "all",
    });
    const bySummary = filterNotifications(NOTIFICATIONS, {
      dateRange: undefined,
      eventType: "",
      resourceKind: "",
      search: "goods receipt",
      status: "all",
    });

    assert.deepEqual(
      byReference.map((item) => item.notificationKey),
      ["33333333-3333-4333-8333-333333333333"],
    );
    assert.deepEqual(
      bySummary.map((item) => item.notificationKey),
      ["33333333-3333-4333-8333-333333333333"],
    );
  });

  it("filters by inclusive date range", () => {
    const result = filterNotifications(NOTIFICATIONS, {
      dateRange: {
        from: new Date("2026-04-24T00:00:00.000Z"),
        to: new Date("2026-04-26T00:00:00.000Z"),
      },
      eventType: "",
      resourceKind: "",
      search: "",
      status: "all",
    });

    assert.deepEqual(
      result.map((item) => item.notificationKey),
      [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    );
  });

  it("builds unique sorted event and resource options", () => {
    assert.deepEqual(buildNotificationEventOptions(NOTIFICATIONS), [
      { label: "Approved", value: "transfer.approved" },
      {
        label: "Goods Received",
        value: "supplier.procurement.received",
      },
      { label: "Invite sent", value: "supplier.portal.invited" },
    ]);

    assert.deepEqual(buildNotificationResourceOptions(NOTIFICATIONS), [
      { label: "Stock Transfer Request", value: "stock_transfer_request" },
      { label: "Supplier Contact", value: "supplier_contact" },
      {
        label: "Supplier Procurement Order",
        value: "supplier_procurement_order",
      },
    ]);
  });

  it("detects whether filters are active", () => {
    assert.equal(
      hasActiveNotificationFilters({
        dateRange: undefined,
        eventType: "",
        resourceKind: "",
        search: "",
        status: "all",
      }),
      false,
    );
    assert.equal(
      hasActiveNotificationFilters({
        dateRange: undefined,
        eventType: "",
        resourceKind: "",
        search: "receipt",
        status: "all",
      }),
      true,
    );
  });
});

function createNotification(input: {
  actorUserSlug: string;
  eventType: string;
  notificationKey: string;
  occurredAt: string;
  resourceKind: string;
  resourceReference: string;
  status: "read" | "unread";
  summary: string;
}): NotificationListItem {
  return {
    actorUserSlug: input.actorUserSlug,
    eventType: input.eventType,
    notificationKey: input.notificationKey,
    occurredAt: input.occurredAt,
    payload: {},
    readAt: input.status === "read" ? input.occurredAt : null,
    resource: {
      kind: input.resourceKind,
      reference: input.resourceReference,
    },
    status: input.status,
    summary: input.summary,
  };
}
