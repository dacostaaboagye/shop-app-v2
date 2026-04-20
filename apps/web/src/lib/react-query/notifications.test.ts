import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  fetchNotifications,
  notificationsQueryKey,
  patchAllNotificationsRead,
  patchNotificationRead,
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
      return new Response(JSON.stringify({ updatedCount: 4 }), { status: 200 });
      },
    );

    const result = await patchAllNotificationsRead();

    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(result.updatedCount, 4);
  });
});
