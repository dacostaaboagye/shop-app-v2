import { z } from "zod";

export const posPaymentMethodSchema = z.enum([
  "cash",
  "card",
  "mobile_money",
  "transfer",
]);

export const invoiceDocumentTypeFilterSchema = z.enum([
  "all",
  "invoice",
  "credit_note",
]);

export const posLineItemRequestSchema = z.object({
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
  unitPrice: z.string().optional(),
});

export const processPosPaymentRequestSchema = z.object({
  lines: z.array(posLineItemRequestSchema).min(1),
  locationId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: posPaymentMethodSchema,
});

export const invoiceLineItemResponseSchema = z.object({
  lineTotal: z.string(),
  quantity: z.number().int(),
  skuId: z.string().uuid(),
  skuSnapshot: z.object({
    productName: z.string(),
    sku: z.string(),
    variantName: z.string(),
  }),
  stockMovementId: z.string().uuid().nullable(),
  taxAmount: z.string(),
  taxCategory: z.string().nullable(),
  taxRate: z.string().nullable(),
  unitPrice: z.string(),
});

export const invoiceResponseSchema = z.object({
  attributedWorkerId: z.string().uuid().nullable(),
  attributedWorkerName: z.string().nullable(),
  attributedWorkerEmail: z.string().nullable(),
  confirmedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  lines: z.array(invoiceLineItemResponseSchema),
  locationId: z.string().uuid(),
  notes: z.string().nullable(),
  paymentMethod: posPaymentMethodSchema.nullable(),
  reference: z.string(),
  status: z.enum(["confirmed", "voided"]),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  type: z.enum(["pos", "portal", "ecommerce", "manual", "credit_note"]),
});

export const posReturnLineItemSchema = z.object({
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
});

export const processPosReturnRequestSchema = z.object({
  lines: z.array(posReturnLineItemSchema).min(1),
  reason: z.string().trim().min(1).max(500),
});

export const invoiceListQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  documentType: invoiceDocumentTypeFilterSchema.default("all"),
  locationId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  workerId: z.string().uuid().optional(),
});

export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceResponseSchema.omit({ lines: true })),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type PosPaymentMethod = z.infer<typeof posPaymentMethodSchema>;
export type InvoiceDocumentTypeFilter = z.infer<
  typeof invoiceDocumentTypeFilterSchema
>;
export type PosLineItemRequest = z.infer<typeof posLineItemRequestSchema>;
export type ProcessPosPaymentRequest = z.infer<
  typeof processPosPaymentRequestSchema
>;
export type ProcessPosReturnRequest = z.infer<
  typeof processPosReturnRequestSchema
>;
export type InvoiceLineItemResponse = z.infer<
  typeof invoiceLineItemResponseSchema
>;
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
