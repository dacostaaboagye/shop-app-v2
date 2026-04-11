import { z } from "zod";
import { catalogEntityStatusSchema } from "./catalog.js";
import { adminProductOptionSchema } from "./catalog-product-options.js";

// ──────────────────────────────────────────────────────────────────────────
// Variants
// ──────────────────────────────────────────────────────────────────────────

export const variantDimensionsSchema = z.object({
  height: z.number().positive().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
});

export const adminVariantSummarySchema = z.object({
  archivedAt: z.iso.datetime().nullable().optional(),
  attributes: z.record(z.string(), z.string()).default({}),
  barcode: z.string().max(80).nullable().optional(),
  costPrice: z.string().min(1),
  createdAt: z.iso.datetime(),
  customsCode: z.string().max(80).nullable().optional(),
  dimensionsCm: variantDimensionsSchema.nullable().optional(),
  isDefault: z.boolean(),
  manufacturerPartNumber: z.string().max(80).nullable().optional(),
  name: z.string().min(1).max(160),
  packagingType: z.string().max(80).nullable().optional(),
  sellingPrice: z.string().min(1),
  sku: z.string().min(1).max(80),
  slug: z.string().min(1).max(120),
  status: catalogEntityStatusSchema,
  unitOfMeasure: z.string().min(1).max(40),
  weightGrams: z.number().int().positive().nullable().optional(),
});

export const adminCreateVariantRequestSchema = z.object({
  attributes: z.record(z.string(), z.string()).default({}),
  barcode: z.string().trim().max(80).nullable().optional(),
  costPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0.00"),
  customsCode: z.string().trim().max(80).nullable().optional(),
  dimensionsCm: variantDimensionsSchema.nullable().optional(),
  isDefault: z.boolean().default(false),
  manufacturerPartNumber: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  packagingType: z.string().trim().max(80).nullable().optional(),
  sellingPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("0.00"),
  sku: z.string().trim().min(1).max(80),
  status: catalogEntityStatusSchema.default("active"),
  unitOfMeasure: z.string().trim().min(1).max(40),
  weightGrams: z.number().int().positive().nullable().optional(),
});

export const adminCreateVariantResponseSchema =
  adminVariantSummarySchema.extend({});

export const adminUpdateVariantRequestSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  barcode: z.string().trim().max(80).nullable().optional(),
  costPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  customsCode: z.string().trim().max(80).nullable().optional(),
  dimensionsCm: variantDimensionsSchema.nullable().optional(),
  isDefault: z.boolean().optional(),
  manufacturerPartNumber: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  packagingType: z.string().trim().max(80).nullable().optional(),
  sellingPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  sku: z.string().trim().min(1).max(80).optional(),
  status: catalogEntityStatusSchema.optional(),
  unitOfMeasure: z.string().trim().min(1).max(40).optional(),
  weightGrams: z.number().int().positive().nullable().optional(),
});

export const adminUpdateVariantResponseSchema =
  adminVariantSummarySchema.extend({});

// ──────────────────────────────────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────────────────────────────────

export const adminProductSummarySchema = z.object({
  archivedAt: z.iso.datetime().nullable().optional(),
  brandSlug: z.string().max(120).nullable().optional(),
  categorySlug: z.string().max(120).nullable().optional(),
  countryOfOrigin: z.string().max(2).nullable().optional(),
  createdAt: z.iso.datetime(),
  description: z.string().nullable().optional(),
  features: z.array(z.string().max(500)).default([]),
  isTaxable: z.boolean(),
  name: z.string().min(1).max(200),
  priceIncludesTax: z.boolean(),
  primaryImageUrl: z.string().nullable().optional(),
  slug: z.string().min(1).max(120),
  status: catalogEntityStatusSchema,
  taxCategory: z.string().max(80).nullable().optional(),
  variantCount: z.number().int().min(0),
});

export const adminProductDetailSchema = adminProductSummarySchema.extend({
  options: z.array(adminProductOptionSchema).default([]),
  variants: z.array(adminVariantSummarySchema).default([]),
});

export const adminProductListQuerySchema = z.object({
  brandSlug: z.string().trim().max(120).default(""),
  categorySlug: z.string().trim().max(120).default(""),
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).default(""),
  sort: z.enum(["name", "status", "createdAt"]).default("name"),
  status: z.enum(["all", "active", "archived"]).default("all"),
});

export const adminProductListResponseSchema = z.object({
  items: z.array(adminProductSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminCreateProductRequestSchema = z.object({
  brandSlug: z.string().trim().max(120).nullable().optional(),
  categorySlug: z.string().trim().max(120).nullable().optional(),
  countryOfOrigin: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .nullable()
    .optional(),
  description: z.string().max(5000).nullable().optional(),
  isTaxable: z.boolean().default(true),
  name: z.string().trim().min(1).max(200),
  priceIncludesTax: z.boolean().default(false),
  status: catalogEntityStatusSchema.default("active"),
  taxCategory: z.string().trim().max(80).nullable().optional(),
});

export const adminCreateProductResponseSchema = adminProductDetailSchema.extend(
  {},
);

export const adminUpdateProductRequestSchema = z.object({
  brandSlug: z.string().trim().max(120).nullable().optional(),
  categorySlug: z.string().trim().max(120).nullable().optional(),
  countryOfOrigin: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .nullable()
    .optional(),
  description: z.string().max(5000).nullable().optional(),
  features: z.array(z.string().trim().max(500)).optional(),
  isTaxable: z.boolean().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  priceIncludesTax: z.boolean().optional(),
  status: catalogEntityStatusSchema.optional(),
  taxCategory: z.string().trim().max(80).nullable().optional(),
});

export const adminUpdateProductResponseSchema = adminProductDetailSchema.extend(
  {},
);

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type VariantDimensions = z.infer<typeof variantDimensionsSchema>;
export type AdminVariantSummary = z.infer<typeof adminVariantSummarySchema>;
export type AdminCreateVariantRequest = z.infer<
  typeof adminCreateVariantRequestSchema
>;
export type AdminCreateVariantResponse = z.infer<
  typeof adminCreateVariantResponseSchema
>;
export type AdminUpdateVariantRequest = z.infer<
  typeof adminUpdateVariantRequestSchema
>;
export type AdminUpdateVariantResponse = z.infer<
  typeof adminUpdateVariantResponseSchema
>;

export type AdminProductSummary = z.infer<typeof adminProductSummarySchema>;
export type AdminProductDetail = z.infer<typeof adminProductDetailSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type AdminProductListResponse = z.infer<
  typeof adminProductListResponseSchema
>;
export type AdminCreateProductRequest = z.infer<
  typeof adminCreateProductRequestSchema
>;
export type AdminCreateProductResponse = z.infer<
  typeof adminCreateProductResponseSchema
>;
export type AdminUpdateProductRequest = z.infer<
  typeof adminUpdateProductRequestSchema
>;
export type AdminUpdateProductResponse = z.infer<
  typeof adminUpdateProductResponseSchema
>;
