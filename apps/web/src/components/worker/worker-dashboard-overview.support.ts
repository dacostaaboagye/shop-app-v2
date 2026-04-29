import type { CurrentAssignment } from "@shop/contracts";
import {
  type SalesLedgerDay,
  type SalesLedgerRecord,
  summarizeSalesLedger,
} from "@/components/sales/sales-ledger-support";
import { getStockStatus } from "./assignments/worker-assignments-support";

export type WorkerStockSummary = {
  assignedVariantCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  topRiskAssignments: CurrentAssignment[];
  totalAssignedUnits: number;
  totalAvailableUnits: number;
};

export type WorkerDashboardMetrics = {
  lowStockCount: number;
  recentCreditNoteCount: number;
  recentNetRevenueAmount: number;
  recentReturnRate: number;
  recentTimelineDays: SalesLedgerDay[];
  todayAverageReceiptAmount: number;
  todayNetRevenueAmount: number;
  todayReceiptCount: number;
  unreadNotificationCount: number;
};

export function summarizeWorkerStock(
  assignments: CurrentAssignment[],
): WorkerStockSummary {
  return {
    assignedVariantCount: assignments.length,
    lowStockCount: assignments.filter(
      (assignment) =>
        getStockStatus(assignment.availableQuantity) === "low_stock",
    ).length,
    outOfStockCount: assignments.filter(
      (assignment) =>
        getStockStatus(assignment.availableQuantity) === "out_of_stock",
    ).length,
    topRiskAssignments: [...assignments]
      .filter(
        (assignment) =>
          getStockStatus(assignment.availableQuantity) !== "in_stock",
      )
      .sort((left, right) => {
        const leftStatus = getStockStatus(left.availableQuantity);
        const rightStatus = getStockStatus(right.availableQuantity);

        if (leftStatus !== rightStatus) {
          return leftStatus === "out_of_stock" ? -1 : 1;
        }

        return left.availableQuantity - right.availableQuantity;
      })
      .slice(0, 5),
    totalAssignedUnits: assignments.reduce(
      (sum, assignment) => sum + assignment.quantity,
      0,
    ),
    totalAvailableUnits: assignments.reduce(
      (sum, assignment) => sum + assignment.availableQuantity,
      0,
    ),
  };
}

export function startOfTodayIso(today = new Date()) {
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  ).toISOString();
}

export function startOfRecentWindowIso(days: number, today = new Date()) {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));
  return start.toISOString();
}

export function summarizeWorkerDashboardMetrics(input: {
  lowStockCount: number;
  recentSales: SalesLedgerRecord[];
  todaySales: SalesLedgerRecord[];
  unreadNotificationCount: number;
}): WorkerDashboardMetrics {
  const todaySummary = summarizeSalesLedger(input.todaySales);
  const recentSummary = summarizeSalesLedger(input.recentSales);

  return {
    lowStockCount: input.lowStockCount,
    recentCreditNoteCount: recentSummary.creditNoteCount,
    recentNetRevenueAmount: recentSummary.netRevenueAmount,
    recentReturnRate:
      recentSummary.transactionCount > 0
        ? Math.round(
            (recentSummary.creditNoteCount / recentSummary.transactionCount) *
              100,
          )
        : 0,
    recentTimelineDays: recentSummary.timelineDays,
    todayAverageReceiptAmount: todaySummary.averageReceiptAmount,
    todayNetRevenueAmount: todaySummary.netRevenueAmount,
    todayReceiptCount: todaySummary.receiptCount,
    unreadNotificationCount: input.unreadNotificationCount,
  };
}
