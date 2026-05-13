import { z } from "zod";

export const stockMovementTypeSchema = z.enum([
  "sale",
  "delivery_receipt",
  "delivery_dispatch",
  "transfer_in",
  "transfer_out",
  "goods_receipt",
  "manual_adjustment",
]);

const dateFilterSchema = z
  .string()
  .trim()
  .max(40)
  .default("")
  .refine(
    (value) =>
      value === "" ||
      /^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isNaN(Date.parse(value)),
    "Use an ISO date or datetime.",
  );

export const adminStockMovementQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  locationSlug: z.string().trim().max(120).default(""),
  movementType: stockMovementTypeSchema.or(z.literal("")).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).default(""),
  sku: z.string().trim().max(120).default(""),
  sourceType: z.string().trim().max(64).default(""),
});

export const managerStockMovementQuerySchema =
  adminStockMovementQuerySchema.extend({
    locationSlug: z.string().trim().min(1).max(120),
  });

export const stockMovementSummarySchema = z.object({
  actorName: z.string().nullable(),
  actorUserSlug: z.string().nullable(),
  locationName: z.string(),
  locationSlug: z.string(),
  movementType: stockMovementTypeSchema,
  note: z.string().nullable(),
  occurredAt: z.iso.datetime(),
  productName: z.string(),
  productSlug: z.string(),
  quantityDelta: z.number().int(),
  reasonCode: z.string().nullable(),
  sku: z.string(),
  sourceReference: z.string().nullable(),
  sourceType: z.string(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export const stockMovementListResponseSchema = z.object({
  items: z.array(stockMovementSummarySchema),
  locationName: z.string().optional(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export type AdminStockMovementQuery = z.infer<
  typeof adminStockMovementQuerySchema
>;
export type ManagerStockMovementQuery = z.infer<
  typeof managerStockMovementQuerySchema
>;
export type StockMovementListResponse = z.infer<
  typeof stockMovementListResponseSchema
>;
export type StockMovementSummary = z.infer<typeof stockMovementSummarySchema>;
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
