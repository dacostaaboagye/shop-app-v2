import { z } from "zod";

const requiredWriteOffNoteSchema = z
  .string()
  .trim()
  .min(3)
  .max(500)
  .transform((value) => value);

export const stockWriteOffReasonCodeSchema = z.enum([
  "damaged",
  "expired",
  "stolen",
  "shrinkage",
  "correction",
]);

export const stockWriteOffRequestSchema = z.object({
  locationSlug: z.string().trim().min(1).max(120),
  note: requiredWriteOffNoteSchema,
  quantity: z.number().int().positive(),
  reasonCode: stockWriteOffReasonCodeSchema,
  sku: z.string().trim().min(1).max(120),
});

export const stockWriteOffResponseSchema = z.object({
  availableQuantity: z.number().int().min(0),
  locationName: z.string(),
  locationSlug: z.string(),
  note: z.string(),
  onHandQuantity: z.number().int().min(0),
  previousOnHandQuantity: z.number().int().min(0),
  productName: z.string(),
  productSlug: z.string(),
  quantityDelta: z.number().int().negative(),
  reasonCode: stockWriteOffReasonCodeSchema,
  reservedQuantity: z.number().int().min(0),
  sku: z.string(),
  updatedAt: z.iso.datetime(),
  variantName: z.string(),
  variantSlug: z.string(),
});

export type StockWriteOffReasonCode = z.infer<
  typeof stockWriteOffReasonCodeSchema
>;
export type StockWriteOffRequest = z.infer<typeof stockWriteOffRequestSchema>;
export type StockWriteOffResponse = z.infer<typeof stockWriteOffResponseSchema>;
