import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  fetchAdminSentCommunications,
  fetchNotifications,
  notificationsQueryKey,
  patchAllNotificationsRead,
  patchNotificationRead,
  postAdminNotificationCompose,
} from "./notifications";

describe("notifications react-query helpers", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("builds the notifications query key", () => {
    assert.deepEqual(notificationsQueryKey(8), [
      "notifications",
      "list",
      { limit: 8 },
    ]);
  });

  it("fetches notifications with the limit query", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.match(String(input), /\/api\/notifications\?limit=8$/);
        return new Response(
          JSON.stringify({
            items: [],
            unreadCount: 0,
          }),
          { status: 200 },
        );
      },
    );

    const result = await fetchNotifications(8);

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.unreadCount, 0);
  });

  it("marks one notification read", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.match(
          String(input),
          /\/api\/notifications\/11111111-1111-4111-8111-111111111111\/read$/,
        );
        assert.equal(init?.method, "PATCH");
        return new Response(
          JSON.stringify({
            notificationKey: "11111111-1111-4111-8111-111111111111",
            readAt: "2026-04-20T01:00:00.000Z",
            status: "read",
          }),
          { status: 200 },
        );
      },
    );

    const result = await patchNotificationRead(
      "11111111-1111-4111-8111-111111111111",
    );

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.status, "read");
  });

  it("marks all notifications read", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.match(String(input), /\/api\/notifications\/read-all$/);
        assert.equal(init?.method, "PATCH");
        return new Response(JSON.stringify({ updatedCount: 4 }), {
          status: 200,
        });
      },
    );

    const result = await patchAllNotificationsRead();

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.updatedCount, 4);
  });

  it("posts an admin communication compose request", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.match(String(input), /\/api\/admin\/notifications\/compose$/);
        assert.equal(init?.method, "POST");
        return new Response(
          JSON.stringify({
            emailRecipientCount: 3,
            notificationRecipientCount: 3,
            ok: true,
            totalRecipientCount: 3,
          }),
          { status: 200 },
        );
      },
    );

    const result = await postAdminNotificationCompose({
      messageBody: "Store A stock count closes at 18:00 UTC.",
      sendEmail: true,
      sendNotification: true,
      subject: "Store A stock count",
      target: {
        audience: { permission: "worker.dashboard.view" },
        kind: "audience",
      },
    });

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.totalRecipientCount, 3);
  });

  it("fetches sent admin communications", async () => {
    const fetchMock = mock.method(
      globalThis,
      "fetch",
      async (input: RequestInfo | URL) => {
        assert.match(
          String(input),
          /\/api\/admin\/notifications\/sent\?page=1&pageSize=10&q=stock$/,
        );
        return new Response(
          JSON.stringify({
            items: [
              {
                actorUserSlug: "admin-user",
                deliveryStatus: "delivered",
                eventId: "11111111-1111-4111-8111-111111111111",
                messageBody: "Stock count closes at 18:00 UTC.",
                occurredAt: "2026-04-27T03:00:00.000Z",
                recipientLabel: "Worker Dashboard View (all locations)",
                sendEmail: true,
                sendNotification: true,
                subject: "Stock count reminder",
              },
            ],
            page: 1,
            pageSize: 10,
            totalCount: 1,
          }),
          { status: 200 },
        );
      },
    );

    const result = await fetchAdminSentCommunications({
      page: 1,
      pageSize: 10,
      q: "stock",
    });

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.items[0]?.subject, "Stock count reminder");
  });
});
