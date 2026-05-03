import { z } from "zod";

export const activeReservationListQuerySchema = z.object({
  expiresAfter: z.iso.datetime().optional(),
  expiresBefore: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  locationId: z.string().uuid(),
  skuId: z.string().uuid().optional(),
  sourceType: z.string().trim().min(1).max(64).optional(),
});

export const activeReservationSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  skuId: z.string().uuid(),
  sourceKey: z.string().min(1).max(160),
  sourceType: z.string().min(1).max(64),
  status: z.literal("active"),
  updatedAt: z.iso.datetime(),
});

export const activeReservationListResponseSchema = z.object({
  items: z.array(activeReservationSummarySchema),
});

export const adminStockBalanceQuerySchema = z.object({
  brandSlug: z.string().trim().max(120).default(""),
  categorySlug: z.string().trim().max(120).default(""),
  locationSlug: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).default(""),
});

export const adminStockBalanceSummarySchema = z.object({
  availableQuantity: z.number().int(),
  inTransitQuantity: z.number().int().min(0),
  locationName: z.string(),
  locationSlug: z.string(),
  onHandQuantity: z.number().int(),
  productName: z.string(),
  productSlug: z.string(),
  reservedQuantity: z.number().int(),
  sku: z.string(),
  skuId: z.string().uuid(),
  updatedAt: z.iso.datetime(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export const adminStockBalanceListResponseSchema = z.object({
  items: z.array(adminStockBalanceSummarySchema),
  locationName: z.string().optional(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const stockCountReasonCodeSchema = z.enum([
  "opening_count",
  "cycle_count",
  "damaged",
  "found_stock",
  "correction",
  "shrinkage",
  "return_restock",
]);

export type ActiveReservationListQuery = z.infer<
  typeof activeReservationListQuerySchema
>;
export type ActiveReservationListResponse = z.infer<
  typeof activeReservationListResponseSchema
>;
export type ActiveReservationSummary = z.infer<
  typeof activeReservationSummarySchema
>;
export const adminReservationQuerySchema = z.object({
  brandSlug: z.string().trim().max(120).default(""),
  categorySlug: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  locationSlug: z.string().trim().max(120).default(""),
  q: z.string().trim().max(120).default(""),
});

export const locationReservationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  locationId: z.string().uuid(),
  q: z.string().trim().max(120).default(""),
});

export const adminReservationSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  locationName: z.string(),
  locationSlug: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  quantity: z.number().int().positive(),
  sku: z.string(),
  skuId: z.string().uuid(),
  sourceKey: z.string(),
  sourceType: z.string(),
  status: z.literal("active"),
  updatedAt: z.iso.datetime(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export const adminReservationListResponseSchema = z.object({
  items: z.array(adminReservationSummarySchema),
  locationName: z.string().optional(),
});

export const adminStockCountRequestSchema = z.object({
  locationSlug: z.string().trim().min(1).max(120),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
  onHandQuantity: z.number().int().min(0),
  reasonCode: stockCountReasonCodeSchema,
  sku: z.string().trim().min(1).max(120),
});

export const adminStockCountResponseSchema =
  adminStockBalanceSummarySchema.extend({
    note: z.string().nullable(),
    previousOnHandQuantity: z.number().int(),
    quantityDelta: z.number().int(),
    reasonCode: stockCountReasonCodeSchema,
    status: z.enum(["changed", "no_change"]),
  });

export type AdminStockBalanceListQuery = z.infer<
  typeof adminStockBalanceQuerySchema
>;
export type AdminStockBalanceListResponse = z.infer<
  typeof adminStockBalanceListResponseSchema
>;
export type AdminStockBalanceSummary = z.infer<
  typeof adminStockBalanceSummarySchema
>;
export type AdminReservationListQuery = z.infer<
  typeof adminReservationQuerySchema
>;
export type AdminReservationListResponse = z.infer<
  typeof adminReservationListResponseSchema
>;
export type AdminReservationSummary = z.infer<
  typeof adminReservationSummarySchema
>;
export type LocationReservationQuery = z.infer<
  typeof locationReservationQuerySchema
>;
export type AdminStockCountRequest = z.infer<
  typeof adminStockCountRequestSchema
>;
export type AdminStockCountResponse = z.infer<
  typeof adminStockCountResponseSchema
>;
export type StockCountReasonCode = z.infer<typeof stockCountReasonCodeSchema>;

export const locationStockBalanceQuerySchema = z.object({
  locationId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).default(""),
});

export type LocationStockBalanceQuery = z.infer<
  typeof locationStockBalanceQuerySchema
>;
