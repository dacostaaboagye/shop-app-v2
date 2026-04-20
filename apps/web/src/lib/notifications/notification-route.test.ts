import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNotificationCenterHref } from "./notification-route";

describe("getNotificationCenterHref", () => {
  it("maps portal routes to their notification center", () => {
    assert.equal(
      getNotificationCenterHref("/worker/stock"),
      "/worker/notifications",
    );
    assert.equal(
      getNotificationCenterHref("/manager"),
      "/manager/notifications",
    );
    assert.equal(
      getNotificationCenterHref("/admin/products"),
      "/admin/notifications",
    );
    assert.equal(
      getNotificationCenterHref("/agent/routes"),
      "/agent/notifications",
    );
  });

  it("falls back to the admin notification center outside portal routes", () => {
    assert.equal(getNotificationCenterHref("/"), "/admin/notifications");
  });
});
