import { z } from "zod";

export const variantSearchQuerySchema = z.object({
  locationId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(120).default(""),
});

export const variantSearchResultSchema = z.object({
  name: z.string(),
  onHandQuantity: z.number().int().min(0),
  primaryImageUrl: z.string().nullable().optional(),
  productName: z.string(),
  productSlug: z.string(),
  sellingPrice: z.string(),
  sku: z.string(),
  variantId: z.string().uuid(),
});

export const variantSearchResponseSchema = z.object({
  items: z.array(variantSearchResultSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type VariantSearchQuery = z.infer<typeof variantSearchQuerySchema>;
export type VariantSearchResult = z.infer<typeof variantSearchResultSchema>;
export type VariantSearchResponse = z.infer<typeof variantSearchResponseSchema>;
