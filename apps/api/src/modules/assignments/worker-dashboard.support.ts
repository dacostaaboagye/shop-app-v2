import type {
  CurrentAssignment,
  WorkerDashboardSalesMetrics,
  WorkerDashboardStockSummary,
  WorkerDashboardTimelineDay,
} from "@shop/contracts";
import type { InvoiceRecord } from "../sales/sales.contracts.js";

const SALES_PAGE_SIZE = 100;
const DAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});

export async function listAllWorkerSales(
  invoiceRepository: {
    listByWorker(input: {
      classification?: "internal" | "outgoing";
      dateFrom?: Date;
      dateTo?: Date;
      documentType?: "adjusted" | "credit_note" | "invoice";
      locationId: string;
      page: number;
      pageSize: number;
      q?: string;
      workerId: string;
    }): Promise<{ items: InvoiceRecord[]; total: number }>;
  },
  input: {
    classification: "outgoing";
    dateFrom: Date;
    locationId: string;
    workerId: string;
  },
) {
  const firstPage = await invoiceRepository.listByWorker({
    classification: input.classification,
    dateFrom: input.dateFrom,
    locationId: input.locationId,
    page: 1,
    pageSize: SALES_PAGE_SIZE,
    workerId: input.workerId,
  });
  const totalPages = Math.max(1, Math.ceil(firstPage.total / SALES_PAGE_SIZE));

  if (totalPages === 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      invoiceRepository.listByWorker({
        classification: input.classification,
        dateFrom: input.dateFrom,
        locationId: input.locationId,
        page: index + 2,
        pageSize: SALES_PAGE_SIZE,
        workerId: input.workerId,
      }),
    ),
  );

  return [
    ...firstPage.items,
    ...remainingPages.flatMap((response) => response.items),
  ];
}

export function summarizeWorkerStock(
  assignments: CurrentAssignment[],
): WorkerDashboardStockSummary {
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

function getStockStatus(availableQuantity: number) {
  if (availableQuantity <= 0) {
    return "out_of_stock";
  }

  if (availableQuantity <= 5) {
    return "low_stock";
  }

  return "in_stock";
}

export function summarizeWorkerDashboardMetrics(input: {
  lowStockCount: number;
  recentSales: InvoiceRecord[];
  todaySales: InvoiceRecord[];
  unreadNotificationCount: number;
}): WorkerDashboardSalesMetrics {
  const todaySummary = summarizeInvoiceRecords(input.todaySales);
  const recentSummary = summarizeInvoiceRecords(input.recentSales);

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

export function toTodayStart(today = new Date()) {
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}

export function toRecentWindowStart(days: number, today = new Date()) {
  const start = toTodayStart(today);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));
  return start;
}

function summarizeInvoiceRecords(records: InvoiceRecord[]) {
  const dayMap = new Map<string, WorkerDashboardTimelineDay>();

  for (const record of records) {
    const dayKey = record.createdAt.toISOString().slice(0, 10);
    const day = dayMap.get(dayKey) ?? {
      adjustedInvoiceAmount: 0,
      adjustedInvoiceCount: 0,
      averageReceiptAmount: 0,
      creditNoteAmount: 0,
      creditNoteCount: 0,
      dateKey: dayKey,
      displayDate: DAY_FORMATTER.format(new Date(`${dayKey}T00:00:00.000Z`)),
      grossSalesAmount: 0,
      netRevenueAmount: 0,
      receiptCount: 0,
      transactionCount: 0,
    };
    const totalAmount = Number(record.totalAmount);
    const isCreditNote = record.type === "credit_note";
    const isAdjustedInvoice = record.type === "adjusted";

    day.transactionCount += 1;

    if (isCreditNote) {
      day.creditNoteAmount += totalAmount;
      day.creditNoteCount += 1;
      day.netRevenueAmount -= totalAmount;
    } else if (isAdjustedInvoice) {
      day.adjustedInvoiceAmount += totalAmount;
      day.adjustedInvoiceCount += 1;
      if (record.status !== "superseded") {
        day.netRevenueAmount += totalAmount;
      }
    } else {
      day.grossSalesAmount += totalAmount;
      if (record.status !== "superseded") {
        day.netRevenueAmount += totalAmount;
      }
      day.receiptCount += 1;
    }

    day.averageReceiptAmount =
      day.receiptCount > 0 ? day.grossSalesAmount / day.receiptCount : 0;
    dayMap.set(dayKey, day);
  }

  const timelineDays = Array.from(dayMap.values()).sort((left, right) =>
    left.dateKey.localeCompare(right.dateKey),
  );
  const grossSalesAmount = timelineDays.reduce(
    (sum, day) => sum + day.grossSalesAmount,
    0,
  );
  const creditNoteAmount = timelineDays.reduce(
    (sum, day) => sum + day.creditNoteAmount,
    0,
  );
  const receiptCount = timelineDays.reduce(
    (sum, day) => sum + day.receiptCount,
    0,
  );

  return {
    averageReceiptAmount:
      receiptCount > 0 ? grossSalesAmount / receiptCount : 0,
    creditNoteAmount,
    creditNoteCount: timelineDays.reduce(
      (sum, day) => sum + day.creditNoteCount,
      0,
    ),
    grossSalesAmount,
    netRevenueAmount: grossSalesAmount - creditNoteAmount,
    receiptCount,
    timelineDays,
    transactionCount: timelineDays.reduce(
      (sum, day) => sum + day.transactionCount,
      0,
    ),
  };
}
