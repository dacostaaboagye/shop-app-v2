import { z } from "zod";

export const catalogReferenceImportEntitySchema = z.enum(["brand", "category"]);
export const catalogReferenceImportRowErrorCodeSchema = z.enum([
  "duplicate_name",
  "existing_name",
  "invalid_status",
  "malformed_csv",
  "missing_required",
  "row_limit_exceeded",
  "invalid_value",
]);

export const catalogBrandImportColumnSchema = z.enum([
  "name",
  "description",
  "website",
  "status",
]);
export const catalogCategoryImportColumnSchema = z.enum([
  "name",
  "description",
  "parentCategorySlug",
  "status",
]);

export const catalogReferenceImportUploadRequestSchema = z
  .object({
    contentType: z.enum(["text/csv", "application/vnd.ms-excel"]),
    csv: z.string().min(1).max(500_000),
    fileName: z.string().trim().min(1).max(240),
  })
  .strict();

export const catalogReferenceImportRowErrorSchema = z
  .object({
    code: catalogReferenceImportRowErrorCodeSchema,
    field: z.string().min(1).max(80).optional(),
    message: z.string().min(1).max(240),
    rowNumber: z.number().int().min(1),
  })
  .strict();

export const catalogReferenceImportFailedRowSchema = z
  .object({
    errors: z.array(catalogReferenceImportRowErrorSchema).min(1),
    originalRow: z.record(z.string(), z.string()),
    rowNumber: z.number().int().min(1),
  })
  .strict();

export const catalogReferenceImportSummarySchema = z
  .object({
    failedRows: z.number().int().min(0),
    importedRows: z.number().int().min(0),
    maxRows: z.number().int().positive(),
    totalRows: z.number().int().min(0),
    truncated: z.boolean(),
  })
  .strict();

export const catalogReferenceImportResponseSchema = z
  .object({
    entity: catalogReferenceImportEntitySchema,
    failedRows: z.array(catalogReferenceImportFailedRowSchema),
    fileName: z.string().min(1).max(255),
    importedSlugs: z.array(z.string().min(1).max(120)),
    processedAt: z.iso.datetime(),
    summary: catalogReferenceImportSummarySchema,
  })
  .strict();

export const catalogReferenceImportTemplateResponseSchema = z
  .object({
    columns: z.array(
      z.object({
        description: z.string().min(1),
        example: z.string(),
        name: z.string().min(1).max(80),
        required: z.boolean(),
      }),
    ),
    csv: z.string().min(1),
    entity: catalogReferenceImportEntitySchema,
    format: z.literal("csv"),
  })
  .strict();

export type CatalogReferenceImportEntity = z.infer<
  typeof catalogReferenceImportEntitySchema
>;
export type CatalogReferenceImportUploadRequest = z.infer<
  typeof catalogReferenceImportUploadRequestSchema
>;
export type CatalogReferenceImportResponse = z.infer<
  typeof catalogReferenceImportResponseSchema
>;
export type CatalogReferenceImportTemplateResponse = z.infer<
  typeof catalogReferenceImportTemplateResponseSchema
>;
