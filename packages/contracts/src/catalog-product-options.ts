import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Option schemas
// ──────────────────────────────────────────────────────────────────────────

export const adminProductOptionValueSchema = z.object({
  valueId: z.string().uuid(),
  position: z.number().int().min(0),
  value: z.string().min(1).max(80),
});

export const adminProductOptionSchema = z.object({
  optionId: z.string().uuid(),
  name: z.string().min(1).max(80),
  position: z.number().int().min(0),
  values: z.array(adminProductOptionValueSchema),
});

// ──────────────────────────────────────────────────────────────────────────
// Request / response schemas
// ──────────────────────────────────────────────────────────────────────────

export const adminCreateProductOptionRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  values: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
});

export const adminAddOptionValueRequestSchema = z.object({
  value: z.string().trim().min(1).max(80),
});

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type AdminProductOptionValue = z.infer<
  typeof adminProductOptionValueSchema
>;
export type AdminProductOption = z.infer<typeof adminProductOptionSchema>;
export type AdminCreateProductOptionRequest = z.infer<
  typeof adminCreateProductOptionRequestSchema
>;
export type AdminAddOptionValueRequest = z.infer<
  typeof adminAddOptionValueRequestSchema
>;
