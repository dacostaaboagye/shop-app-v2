import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminTransferMetrics,
  getOpenAdminTransfers,
} from "./admin-dashboard-overview.support";

test("getAdminTransferMetrics summarises transfer pressure", () => {
  const now = new Date("2026-04-27T12:00:00.000Z");
  const metrics = getAdminTransferMetrics(
    [
      {
        createdAt: "2026-04-26T08:00:00.000Z",
        sourceReservationStatus: null,
        status: "pending",
      },
      {
        createdAt: "2026-04-27T08:00:00.000Z",
        sourceReservationStatus: "active",
        status: "approved",
      },
      {
        createdAt: "2026-04-27T09:00:00.000Z",
        sourceReservationStatus: "expired",
        status: "approved",
      },
      {
        createdAt: "2026-04-27T10:00:00.000Z",
        sourceReservationStatus: "confirmed",
        status: "dispatched",
      },
      {
        createdAt: "2026-04-27T11:00:00.000Z",
        sourceReservationStatus: null,
        status: "received",
      },
    ],
    now,
  );

  assert.deepEqual(metrics, {
    ageingCount: 1,
    bottleneckCount: 1,
    exceptionCount: 1,
    inTransitCount: 1,
    needsReviewCount: 1,
  });
});

test("getOpenAdminTransfers excludes closed transfers", () => {
  const items = getOpenAdminTransfers(
    [
      { createdAt: "", status: "pending" },
      { createdAt: "", status: "received" },
      { createdAt: "", status: "approved" },
      { createdAt: "", status: "cancelled" },
    ],
    5,
  );

  assert.deepEqual(
    items.map((item) => item.status),
    ["pending", "approved"],
  );
});
