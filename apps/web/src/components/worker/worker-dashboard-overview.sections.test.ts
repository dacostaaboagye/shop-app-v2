import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  startOfRecentWindowIso,
  summarizeWorkerDashboardMetrics,
} from "./worker-dashboard-overview.support";

describe("worker dashboard overview sections", () => {
  it("builds an inclusive recent window start in UTC", () => {
    const today = new Date("2026-04-29T12:30:00.000Z");

    assert.equal(startOfRecentWindowIso(7, today), "2026-04-23T00:00:00.000Z");
    assert.equal(startOfRecentWindowIso(1, today), "2026-04-29T00:00:00.000Z");
  });

  it("summarizes the worker dashboard KPIs from sales and operations signals", () => {
    const metrics = summarizeWorkerDashboardMetrics({
      lowStockCount: 2,
      recentSales: [
        {
          createdAt: "2026-04-29T09:00:00.000Z",
          reference: "INV/2026/000001",
          status: "confirmed",
          totalAmount: "150.00",
          type: "pos",
        },
        {
          createdAt: "2026-04-29T11:00:00.000Z",
          reference: "CRN/2026/000001",
          status: "confirmed",
          totalAmount: "30.00",
          type: "credit_note",
        },
      ] as never,
      todaySales: [
        {
          createdAt: "2026-04-29T09:00:00.000Z",
          reference: "INV/2026/000001",
          status: "confirmed",
          totalAmount: "150.00",
          type: "pos",
        },
      ] as never,
      unreadNotificationCount: 3,
    });

    assert.equal(metrics.todayReceiptCount, 1);
    assert.equal(metrics.todayNetRevenueAmount, 150);
    assert.equal(metrics.recentNetRevenueAmount, 120);
    assert.equal(metrics.recentCreditNoteCount, 1);
    assert.equal(metrics.recentReturnRate, 50);
    assert.equal(metrics.lowStockCount, 2);
    assert.equal(metrics.unreadNotificationCount, 3);
  });
});
