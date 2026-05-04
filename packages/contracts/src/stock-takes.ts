import { z } from "zod";

export const stockTakeModeSchema = z.enum(["blind", "assisted"]);

export const stockTakeStatusSchema = z.enum([
  "generated",
  "counted",
  "reviewed",
  "applied",
  "cancelled",
]);

const optionalScopeSlugSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value ? value : undefined));

export const stockTakeCreateRequestSchema = z.object({
  brandSlug: optionalScopeSlugSchema,
  categorySlug: optionalScopeSlugSchema,
  locationSlug: z.string().trim().min(1).max(120),
  mode: stockTakeModeSchema.default("blind"),
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const stockTakeReferenceParamsSchema = z.object({
  reference: z.string().trim().min(1).max(40),
});

export const stockTakeSessionSummarySchema = z.object({
  blankSheet: z.boolean(),
  generatedAt: z.iso.datetime(),
  generatedByUserSlug: z.string().nullable(),
  lineCount: z.number().int().min(0),
  locationName: z.string(),
  locationSlug: z.string(),
  mode: stockTakeModeSchema,
  printableBookletUrl: z.string().min(1),
  sheetCsvUrl: z.string().min(1),
  status: stockTakeStatusSchema,
  stockTakeReference: z.string().min(1).max(40),
});

export const stockTakeLineSchema = z.object({
  availableQuantity: z.number().int().min(0).nullable(),
  barcode: z.string().nullable(),
  countedQuantity: z.number().int().min(0).nullable(),
  lineNumber: z.number().int().positive(),
  note: z.string().nullable(),
  productName: z.string(),
  productSlug: z.string().nullable(),
  reservedQuantity: z.number().int().min(0).nullable(),
  rowStatus: z.enum(["catalog_sku", "manual_blank", "counted", "skipped"]),
  sku: z.string(),
  systemOnHand: z.number().int().min(0).nullable(),
  unitOfMeasure: z.string(),
  variance: z.number().int().nullable(),
  variantName: z.string(),
  variantSlug: z.string().nullable(),
});

export const stockTakeSessionDetailSchema =
  stockTakeSessionSummarySchema.extend({
    lines: z.array(stockTakeLineSchema),
  });

export type StockTakeCreateRequest = z.infer<
  typeof stockTakeCreateRequestSchema
>;
export type StockTakeLine = z.infer<typeof stockTakeLineSchema>;
export type StockTakeMode = z.infer<typeof stockTakeModeSchema>;
export type StockTakeSessionDetail = z.infer<
  typeof stockTakeSessionDetailSchema
>;
export type StockTakeSessionSummary = z.infer<
  typeof stockTakeSessionSummarySchema
>;
export type StockTakeStatus = z.infer<typeof stockTakeStatusSchema>;
