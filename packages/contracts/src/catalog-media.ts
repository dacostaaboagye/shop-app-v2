import { z } from "zod";

export const catalogMediaEntityTypeSchema = z.enum([
  "brand",
  "category",
  "location",
  "product",
  "user",
  "variant",
]);

export const catalogMediaTypeSchema = z.enum(["image", "video"]);

export const ALLOWED_MEDIA_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// Represents one catalog_media_assignments row joined with its media_assets row.
export const adminMediaRecordSchema = z.object({
  // Assignment fields
  assignmentId: z.string().uuid(),
  entityType: catalogMediaEntityTypeSchema,
  entitySlug: z.string(),
  position: z.number().int(),
  isPrimary: z.boolean(),
  altText: z.string().nullable().optional(),
  assignedAt: z.iso.datetime(),
  // Asset fields (resolved via JOIN)
  assetId: z.string().uuid(),
  storageKey: z.string(),
  publicUrl: z.string(),
  mimeType: z.string(),
  mediaType: catalogMediaTypeSchema,
  fileSizeBytes: z.number().int().nullable().optional(),
  widthPx: z.number().int().nullable().optional(),
  heightPx: z.number().int().nullable().optional(),
});

export const adminMediaPresignRequestSchema = z.object({
  entitySlug: z.string().min(1).max(120),
  entityType: catalogMediaEntityTypeSchema,
  fileSizeBytes: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
});

export const adminMediaPresignResponseSchema = z.object({
  expiresAt: z.iso.datetime(),
  key: z.string(),
  publicUrl: z.string(),
  uploadUrl: z.string(),
});

export const adminMediaConfirmRequestSchema = z.object({
  altText: z.string().max(300).nullable().optional(),
  entitySlug: z.string().min(1).max(120),
  entityType: catalogMediaEntityTypeSchema,
  fileSizeBytes: z.number().int().positive().optional(),
  heightPx: z.number().int().positive().optional(),
  isPrimary: z.boolean().default(false),
  key: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(100),
  position: z.number().int().min(0).default(0),
  widthPx: z.number().int().positive().optional(),
});

export const adminMediaUpdateRequestSchema = z.object({
  altText: z.string().max(300).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const adminMediaListResponseSchema = z.object({
  items: z.array(adminMediaRecordSchema),
});

export const adminMediaSetPrimaryRequestSchema = z.object({
  entitySlug: z.string().min(1).max(120),
  entityType: catalogMediaEntityTypeSchema,
});

export type CatalogMediaEntityType = z.infer<
  typeof catalogMediaEntityTypeSchema
>;
export type CatalogMediaType = z.infer<typeof catalogMediaTypeSchema>;
export type AdminMediaRecord = z.infer<typeof adminMediaRecordSchema>;
export type AdminMediaPresignRequest = z.infer<
  typeof adminMediaPresignRequestSchema
>;
export type AdminMediaPresignResponse = z.infer<
  typeof adminMediaPresignResponseSchema
>;
export type AdminMediaConfirmRequest = z.infer<
  typeof adminMediaConfirmRequestSchema
>;
export type AdminMediaUpdateRequest = z.infer<
  typeof adminMediaUpdateRequestSchema
>;
export type AdminMediaListResponse = z.infer<
  typeof adminMediaListResponseSchema
>;
export type AdminMediaSetPrimaryRequest = z.infer<
  typeof adminMediaSetPrimaryRequestSchema
>;
