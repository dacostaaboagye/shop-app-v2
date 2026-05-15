import { z } from "zod";
import { catalogEntityStatusSchema } from "./catalog.js";

export const catalogImportRequiredColumns = [
  "productName",
  "variantName",
  "sku",
  "unitOfMeasure",
  "costPrice",
  "sellingPrice",
] as const;

export const catalogImportOptionalColumns = [
  "categorySlug",
  "brandSlug",
  "barcode",
  "status",
  "description",
  "countryOfOrigin",
  "isTaxable",
  "priceIncludesTax",
  "taxCategory",
  "attributesJson",
  "weightGrams",
  "packagingType",
  "manufacturerPartNumber",
  "customsCode",
] as const;

export const catalogImportStatusSchema = catalogEntityStatusSchema;
export const catalogImportJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
]);

export const catalogImportRowErrorCodeSchema = z.enum([
  "missing_required",
  "invalid_value",
  "invalid_money",
  "invalid_status",
  "duplicate_sku",
  "duplicate_barcode",
  "malformed_json",
  "malformed_csv",
  "row_limit_exceeded",
]);

const publicJobReferenceSchema = z.string().regex(/^CIMP-[A-Z0-9-]{5,32}$/);
const importColumnNameSchema = z.enum([
  ...catalogImportRequiredColumns,
  ...catalogImportOptionalColumns,
]);
const nonEmptyStringSchema = z.string().trim().min(1);
const nullableStringSchema = z.string().trim().min(1).nullable();

export const catalogImportColumnSchema = z
  .object({
    description: z.string().min(1),
    example: z.string(),
    name: importColumnNameSchema,
    required: z.boolean(),
  })
  .strict();

export const catalogImportTemplateResponseSchema = z
  .object({
    columns: z.array(catalogImportColumnSchema),
    csv: z.string().min(1),
    exampleRows: z
      .array(z.partialRecord(importColumnNameSchema, z.string()))
      .min(1),
    format: z.literal("csv"),
    optionalColumns: z.array(z.enum(catalogImportOptionalColumns)),
    requiredColumns: z.array(z.enum(catalogImportRequiredColumns)),
  })
  .strict();

export const catalogImportNormalizedRowSchema = z
  .object({
    attributes: z.record(z.string(), z.string()).default({}),
    barcode: nullableStringSchema.optional(),
    brandSlug: nullableStringSchema.optional(),
    categorySlug: nullableStringSchema.optional(),
    costPrice: nonEmptyStringSchema.regex(/^\d+(\.\d{2})$/),
    countryOfOrigin: z.string().length(2).nullable().optional(),
    customsCode: nullableStringSchema.optional(),
    description: nullableStringSchema.optional(),
    isTaxable: z.boolean().nullable().optional(),
    manufacturerPartNumber: nullableStringSchema.optional(),
    packagingType: nullableStringSchema.optional(),
    priceIncludesTax: z.boolean().nullable().optional(),
    productName: z.string().trim().min(1).max(200),
    rowNumber: z.number().int().min(2),
    sellingPrice: nonEmptyStringSchema.regex(/^\d+(\.\d{2})$/),
    sku: z.string().trim().min(1).max(80),
    status: catalogImportStatusSchema.default("active"),
    taxCategory: nullableStringSchema.optional(),
    unitOfMeasure: z.string().trim().min(1).max(40),
    variantName: z.string().trim().min(1).max(160),
    weightGrams: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const catalogImportRowErrorSchema = z
  .object({
    code: catalogImportRowErrorCodeSchema,
    field: importColumnNameSchema.optional(),
    message: z.string().min(1).max(240),
    rowNumber: z.number().int().min(1),
  })
  .strict();

export const catalogImportParseSummarySchema = z
  .object({
    invalidRows: z.number().int().min(0),
    maxRows: z.number().int().positive(),
    totalRows: z.number().int().min(0),
    truncated: z.boolean(),
    validRows: z.number().int().min(0),
  })
  .strict();

export const catalogImportUploadResponseSchema = z
  .object({
    acceptedAt: z.iso.datetime(),
    fileName: z.string().min(1).max(255),
    jobReference: publicJobReferenceSchema,
    maxRows: z.number().int().positive(),
    status: catalogImportJobStatusSchema,
  })
  .strict();

export const catalogImportUploadRequestSchema = z
  .object({
    contentType: z.enum(["text/csv", "application/vnd.ms-excel"]),
    csv: z.string().min(1).max(1_000_000),
    fileName: z.string().trim().min(1).max(240),
  })
  .strict();

export const catalogImportDryRunResponseSchema = z
  .object({
    errors: z.array(catalogImportRowErrorSchema),
    summary: catalogImportParseSummarySchema,
    validRows: z.array(catalogImportNormalizedRowSchema),
  })
  .strict();

export const catalogImportJobResponseSchema = z
  .object({
    completedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    fileName: z.string().min(1).max(255),
    jobReference: publicJobReferenceSchema,
    reportAvailable: z.boolean(),
    status: catalogImportJobStatusSchema,
    summary: catalogImportParseSummarySchema,
  })
  .strict();

export const catalogImportFailedRowSchema = z
  .object({
    errors: z.array(catalogImportRowErrorSchema).min(1),
    originalRow: z.record(z.string(), z.string()),
    rowNumber: z.number().int().min(1),
  })
  .strict();

export const catalogImportReportResponseSchema = z
  .object({
    failedRows: z.array(catalogImportFailedRowSchema),
    generatedAt: z.iso.datetime(),
    jobReference: publicJobReferenceSchema,
    summary: catalogImportParseSummarySchema,
  })
  .strict();

export type CatalogImportStatus = z.infer<typeof catalogImportStatusSchema>;
export type CatalogImportJobStatus = z.infer<
  typeof catalogImportJobStatusSchema
>;
export type CatalogImportRowErrorCode = z.infer<
  typeof catalogImportRowErrorCodeSchema
>;
export type CatalogImportNormalizedRow = z.infer<
  typeof catalogImportNormalizedRowSchema
>;
export type CatalogImportRowError = z.infer<typeof catalogImportRowErrorSchema>;
export type CatalogImportParseSummary = z.infer<
  typeof catalogImportParseSummarySchema
>;
export type CatalogImportTemplateResponse = z.infer<
  typeof catalogImportTemplateResponseSchema
>;
export type CatalogImportUploadResponse = z.infer<
  typeof catalogImportUploadResponseSchema
>;
export type CatalogImportUploadRequest = z.infer<
  typeof catalogImportUploadRequestSchema
>;
export type CatalogImportDryRunResponse = z.infer<
  typeof catalogImportDryRunResponseSchema
>;
export type CatalogImportJobResponse = z.infer<
  typeof catalogImportJobResponseSchema
>;
export type CatalogImportReportResponse = z.infer<
  typeof catalogImportReportResponseSchema
>;
