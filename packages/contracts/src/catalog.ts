import { z } from "zod";

export const catalogEntityStatusSchema = z.enum(["active", "archived"]);

// ──────────────────────────────────────────────────────────────────────────
// Brands
// ──────────────────────────────────────────────────────────────────────────

export const adminBrandSummarySchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  primaryImageUrl: z.string().nullable().optional(),
  slug: z.string().min(1).max(120),
  status: catalogEntityStatusSchema,
  website: z.string().max(500).nullable().optional(),
});

export const adminBrandListQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).default(""),
  sort: z.enum(["name", "status", "createdAt"]).default("name"),
  status: z.enum(["all", "active", "archived"]).default("all"),
});

export const adminBrandListResponseSchema = z.object({
  items: z.array(adminBrandSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminCreateBrandRequestSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  status: catalogEntityStatusSchema.default("active"),
  website: z.string().trim().max(500).nullable().optional(),
});

export const adminCreateBrandResponseSchema = adminBrandSummarySchema.extend(
  {},
);

export const adminUpdateBrandRequestSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  status: catalogEntityStatusSchema.optional(),
  website: z.string().trim().max(500).nullable().optional(),
});

export const adminUpdateBrandResponseSchema = adminBrandSummarySchema.extend(
  {},
);

// ──────────────────────────────────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────────────────────────────────

export const adminCategorySummarySchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  parentCategorySlug: z.string().max(120).nullable().optional(),
  primaryImageUrl: z.string().nullable().optional(),
  slug: z.string().min(1).max(120),
  status: catalogEntityStatusSchema,
});

export const adminCategoryListQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).default(""),
  sort: z.enum(["name", "status", "createdAt"]).default("name"),
  status: z.enum(["all", "active", "archived"]).default("all"),
});

export const adminCategoryListResponseSchema = z.object({
  items: z.array(adminCategorySummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminCreateCategoryRequestSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  parentCategorySlug: z.string().trim().max(120).nullable().optional(),
  status: catalogEntityStatusSchema.default("active"),
});

export const adminCreateCategoryResponseSchema =
  adminCategorySummarySchema.extend({});

export const adminUpdateCategoryRequestSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  parentCategorySlug: z.string().trim().max(120).nullable().optional(),
  status: catalogEntityStatusSchema.optional(),
});

export const adminUpdateCategoryResponseSchema =
  adminCategorySummarySchema.extend({});

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type CatalogEntityStatus = z.infer<typeof catalogEntityStatusSchema>;

export type AdminBrandSummary = z.infer<typeof adminBrandSummarySchema>;
export type AdminBrandListQuery = z.infer<typeof adminBrandListQuerySchema>;
export type AdminBrandListResponse = z.infer<
  typeof adminBrandListResponseSchema
>;
export type AdminCreateBrandRequest = z.infer<
  typeof adminCreateBrandRequestSchema
>;
export type AdminCreateBrandResponse = z.infer<
  typeof adminCreateBrandResponseSchema
>;
export type AdminUpdateBrandRequest = z.infer<
  typeof adminUpdateBrandRequestSchema
>;
export type AdminUpdateBrandResponse = z.infer<
  typeof adminUpdateBrandResponseSchema
>;

export type AdminCategorySummary = z.infer<typeof adminCategorySummarySchema>;
export type AdminCategoryListQuery = z.infer<
  typeof adminCategoryListQuerySchema
>;
export type AdminCategoryListResponse = z.infer<
  typeof adminCategoryListResponseSchema
>;
export type AdminCreateCategoryRequest = z.infer<
  typeof adminCreateCategoryRequestSchema
>;
export type AdminCreateCategoryResponse = z.infer<
  typeof adminCreateCategoryResponseSchema
>;
export type AdminUpdateCategoryRequest = z.infer<
  typeof adminUpdateCategoryRequestSchema
>;
export type AdminUpdateCategoryResponse = z.infer<
  typeof adminUpdateCategoryResponseSchema
>;
