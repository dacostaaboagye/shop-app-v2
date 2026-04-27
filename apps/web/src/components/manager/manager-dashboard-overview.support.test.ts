import assert from "node:assert/strict";
import test from "node:test";
import { getManagerDashboardMetrics } from "./manager-dashboard-overview.support";

test("getManagerDashboardMetrics summarises location operations", () => {
  const metrics = getManagerDashboardMetrics({
    sales: [
      { totalAmount: "150.00", type: "pos" },
      { totalAmount: "30.00", type: "credit_note" },
      { totalAmount: "90.00", type: "pos" },
    ],
    stock: [
      { availableQuantity: 12 },
      { availableQuantity: 5 },
      { availableQuantity: 0 },
    ],
    transfers: [
      { status: "pending" },
      { status: "received" },
      { status: "dispatched" },
    ],
  });

  assert.deepEqual(metrics, {
    averageSaleValue: 80,
    lowStockCount: 2,
    openTransferCount: 2,
    skuCount: 3,
    todaysRevenue: 240,
    transactionCount: 3,
  });
});
