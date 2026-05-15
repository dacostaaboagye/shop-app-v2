import { z } from "zod";
import {
  stockTakeModeSchema,
  stockTakeSessionSummarySchema,
  stockTakeStatusSchema,
} from "./stock-takes.js";

export const stockTakeSessionListQuerySchema = z.object({
  locationSlug: z.string().trim().max(120).optional(),
  mode: stockTakeModeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).optional(),
  status: stockTakeStatusSchema.optional(),
});

export const stockTakeSessionListResponseSchema = z.object({
  items: z.array(stockTakeSessionSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().min(0),
});

export type StockTakeSessionListQuery = z.infer<
  typeof stockTakeSessionListQuerySchema
>;
export type StockTakeSessionListResponse = z.infer<
  typeof stockTakeSessionListResponseSchema
>;
