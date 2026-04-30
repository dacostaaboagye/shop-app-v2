import { z } from "zod";
import { invoiceResponseSchema } from "./sales.js";
import { stockSupplyRequestResponseSchema } from "./stock-supply.js";

export const managerDashboardSummaryQuerySchema = z.object({
  locationId: z.string().uuid(),
});

export const managerDashboardSalesSummarySchema = z.object({
  averageSaleValue: z.number(),
  latestSales: z.array(invoiceResponseSchema.omit({ lines: true })),
  todaysRevenue: z.number(),
  transactionCount: z.number().int().min(0),
});

export const managerDashboardTransferSummarySchema = z.object({
  activeTransfers: z.array(stockSupplyRequestResponseSchema),
  openTransferCount: z.number().int().min(0),
});

export const managerDashboardSummaryResponseSchema = z.object({
  locationId: z.string().uuid(),
  lowStockCount: z.number().int().min(0),
  sales: managerDashboardSalesSummarySchema.nullable(),
  skuCount: z.number().int().min(0),
  transfers: managerDashboardTransferSummarySchema.nullable(),
});

export type ManagerDashboardSummaryQuery = z.infer<
  typeof managerDashboardSummaryQuerySchema
>;
export type ManagerDashboardSalesSummary = z.infer<
  typeof managerDashboardSalesSummarySchema
>;
export type ManagerDashboardTransferSummary = z.infer<
  typeof managerDashboardTransferSummarySchema
>;
export type ManagerDashboardSummaryResponse = z.infer<
  typeof managerDashboardSummaryResponseSchema
>;
