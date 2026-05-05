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

const stockTakeImportCsvRequestSchema = z
  .object({
    contentType: z.enum(["text/csv", "application/vnd.ms-excel"]),
    csv: z.string().min(1).max(1_000_000),
    fileName: z.string().trim().min(1).max(240),
  })
  .strict();

const stockTakeImportXlsxRequestSchema = z
  .object({
    contentType: z.literal(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
    fileName: z.string().trim().min(1).max(240),
    workbookBase64: z.string().min(1).max(5_000_000),
  })
  .strict();

export const stockTakeImportDryRunRequestSchema = z.discriminatedUnion(
  "contentType",
  [stockTakeImportCsvRequestSchema, stockTakeImportXlsxRequestSchema],
);

export const stockTakeApplyRequestSchema = z.discriminatedUnion("contentType", [
  stockTakeImportCsvRequestSchema.extend({
    reviewed: z.literal(true),
  }),
  stockTakeImportXlsxRequestSchema.extend({
    reviewed: z.literal(true),
  }),
]);

export const stockTakeSessionSummarySchema = z.object({
  appliedAt: z.iso.datetime().nullable(),
  appliedByUserSlug: z.string().nullable(),
  blankSheet: z.boolean(),
  bookletPdfUrl: z.string().min(1),
  generatedAt: z.iso.datetime(),
  generatedByUserSlug: z.string().nullable(),
  lineCount: z.number().int().min(0),
  locationName: z.string(),
  locationSlug: z.string(),
  mode: stockTakeModeSchema,
  printableBookletUrl: z.string().min(1),
  sheetCsvUrl: z.string().min(1),
  sheetXlsxUrl: z.string().min(1),
  status: stockTakeStatusSchema,
  stockTakeReference: z.string().min(1).max(40),
  varianceReportPdfUrl: z.string().min(1).nullable(),
});

export const stockTakeLineSchema = z.object({
  appliedDelta: z.number().int().nullable(),
  availableQuantity: z.number().int().min(0).nullable(),
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

export const stockTakeDryRunErrorCodeSchema = z.enum([
  "duplicate_line",
  "duplicate_sku",
  "invalid_quantity",
  "line_sku_mismatch",
  "malformed_csv",
  "manual_row_unsupported",
  "missing_line",
  "missing_required",
  "reserved_conflict",
  "system_drift",
  "unknown_sku",
]);

export const stockTakeDryRunFieldSchema = z.enum([
  "countedQuantity",
  "lineNumber",
  "notes",
  "sku",
]);

export const stockTakeDryRunRowStatusSchema = z.enum([
  "valid",
  "invalid",
  "manual_unsupported",
]);

export const stockTakeDryRunRowErrorSchema = z
  .object({
    code: stockTakeDryRunErrorCodeSchema,
    field: stockTakeDryRunFieldSchema.optional(),
    lineNumber: z.number().int().positive().optional(),
    message: z.string().min(1).max(240),
    rowNumber: z.number().int().positive(),
    sku: z.string().max(80).optional(),
  })
  .strict();

export const stockTakeDryRunPreviewRowSchema = z
  .object({
    availableQuantity: z.number().int().min(0).nullable(),
    countedQuantity: z.number().int().min(0).nullable(),
    lineNumber: z.number().int().positive().nullable(),
    note: z.string().nullable(),
    productName: z.string(),
    reservedQuantity: z.number().int().min(0).nullable(),
    rowNumber: z.number().int().positive(),
    sku: z.string(),
    status: stockTakeDryRunRowStatusSchema,
    systemOnHand: z.number().int().min(0).nullable(),
    variance: z.number().int().nullable(),
    variantName: z.string(),
  })
  .strict();

export const stockTakeDryRunSummarySchema = z
  .object({
    duplicateRows: z.number().int().min(0),
    invalidRows: z.number().int().min(0),
    totalNegativeVariance: z.number().int().max(0),
    totalPositiveVariance: z.number().int().min(0),
    totalRows: z.number().int().min(0),
    unknownRows: z.number().int().min(0),
    validRows: z.number().int().min(0),
    varianceRows: z.number().int().min(0),
  })
  .strict();

export const stockTakeImportDryRunResponseSchema = z
  .object({
    canApply: z.boolean(),
    errors: z.array(stockTakeDryRunRowErrorSchema),
    locationName: z.string(),
    locationSlug: z.string(),
    rows: z.array(stockTakeDryRunPreviewRowSchema),
    status: stockTakeStatusSchema,
    stockTakeReference: z.string().min(1).max(40),
    summary: stockTakeDryRunSummarySchema,
  })
  .strict();

export const stockTakeApplyLineSchema = z
  .object({
    countedQuantity: z.number().int().min(0),
    lineNumber: z.number().int().positive(),
    movementCreated: z.boolean(),
    previousOnHandQuantity: z.number().int().min(0),
    productName: z.string(),
    quantityDelta: z.number().int(),
    sku: z.string(),
    status: z.enum(["changed", "no_change"]),
    variantName: z.string(),
  })
  .strict();

export const stockTakeApplySummarySchema = z
  .object({
    appliedRows: z.number().int().min(0),
    changedRows: z.number().int().min(0),
    noChangeRows: z.number().int().min(0),
    totalNegativeDelta: z.number().int().max(0),
    totalPositiveDelta: z.number().int().min(0),
  })
  .strict();

export const stockTakeApplyResponseSchema = z
  .object({
    appliedAt: z.iso.datetime(),
    appliedByUserSlug: z.string().nullable(),
    lines: z.array(stockTakeApplyLineSchema),
    locationName: z.string(),
    locationSlug: z.string(),
    status: z.literal("applied"),
    stockTakeReference: z.string().min(1).max(40),
    summary: stockTakeApplySummarySchema,
  })
  .strict();

export type StockTakeCreateRequest = z.infer<
  typeof stockTakeCreateRequestSchema
>;
export type StockTakeDryRunErrorCode = z.infer<
  typeof stockTakeDryRunErrorCodeSchema
>;
export type StockTakeDryRunField = z.infer<typeof stockTakeDryRunFieldSchema>;
export type StockTakeDryRunPreviewRow = z.infer<
  typeof stockTakeDryRunPreviewRowSchema
>;
export type StockTakeDryRunRowError = z.infer<
  typeof stockTakeDryRunRowErrorSchema
>;
export type StockTakeDryRunSummary = z.infer<
  typeof stockTakeDryRunSummarySchema
>;
export type StockTakeApplyRequest = z.infer<typeof stockTakeApplyRequestSchema>;
export type StockTakeApplyResponse = z.infer<
  typeof stockTakeApplyResponseSchema
>;
export type StockTakeImportDryRunRequest = z.infer<
  typeof stockTakeImportDryRunRequestSchema
>;
export type StockTakeImportDryRunResponse = z.infer<
  typeof stockTakeImportDryRunResponseSchema
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
