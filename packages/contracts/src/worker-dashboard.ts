import { z } from "zod";
import { currentAssignmentSchema } from "./assignments.js";
import { notificationListItemSchema } from "./notifications.js";
import { invoiceResponseSchema } from "./sales.js";

export const workerDashboardSummaryQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const workerDashboardTimelineDaySchema = z.object({
  adjustedInvoiceAmount: z.number(),
  adjustedInvoiceCount: z.number().int().min(0),
  averageReceiptAmount: z.number(),
  creditNoteAmount: z.number(),
  creditNoteCount: z.number().int().min(0),
  dateKey: z.string(),
  displayDate: z.string(),
  grossSalesAmount: z.number(),
  netRevenueAmount: z.number(),
  receiptCount: z.number().int().min(0),
  transactionCount: z.number().int().min(0),
});

export const workerDashboardSalesMetricsSchema = z.object({
  lowStockCount: z.number().int().min(0),
  recentCreditNoteCount: z.number().int().min(0),
  recentNetRevenueAmount: z.number(),
  recentReturnRate: z.number().int().min(0),
  recentTimelineDays: z.array(workerDashboardTimelineDaySchema),
  todayAverageReceiptAmount: z.number(),
  todayNetRevenueAmount: z.number(),
  todayReceiptCount: z.number().int().min(0),
  unreadNotificationCount: z.number().int().min(0),
});

export const workerDashboardStockSummarySchema = z.object({
  assignedVariantCount: z.number().int().min(0),
  lowStockCount: z.number().int().min(0),
  outOfStockCount: z.number().int().min(0),
  topRiskAssignments: z.array(currentAssignmentSchema),
  totalAssignedUnits: z.number().int().min(0),
  totalAvailableUnits: z.number().int().min(0),
});

export const workerDashboardSummaryResponseSchema = z.object({
  latestNotifications: z.array(notificationListItemSchema),
  latestSales: z.array(invoiceResponseSchema.omit({ lines: true })),
  locationId: z.string().uuid(),
  metrics: workerDashboardSalesMetricsSchema.nullable(),
  stockSummary: workerDashboardStockSummarySchema,
});

export type WorkerDashboardSummaryQuery = z.infer<
  typeof workerDashboardSummaryQuerySchema
>;
export type WorkerDashboardTimelineDay = z.infer<
  typeof workerDashboardTimelineDaySchema
>;
export type WorkerDashboardSalesMetrics = z.infer<
  typeof workerDashboardSalesMetricsSchema
>;
export type WorkerDashboardStockSummary = z.infer<
  typeof workerDashboardStockSummarySchema
>;
export type WorkerDashboardSummaryResponse = z.infer<
  typeof workerDashboardSummaryResponseSchema
>;
