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
  "adjusted",
]);

export const invoiceClassificationSchema = z.enum(["outgoing", "internal"]);

export const invoiceClassificationFilterSchema = z.enum([
  "all",
  "outgoing",
  "internal",
]);

export const invoiceDocumentRoleSchema = z.enum([
  "standard",
  "credit_note",
  "adjusted",
]);

export const posLineItemRequestSchema = z.object({
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
  unitPrice: z.string().optional(),
});

export const processPosPaymentRequestSchema = z.object({
  customerBillingAddressLines: z.array(z.string().trim().min(1)).optional(),
  customerEmail: z.string().trim().email().optional(),
  customerName: z.string().trim().min(1).max(160).optional(),
  customerPhone: z.string().trim().min(1).max(40).optional(),
  customerTaxNumber: z.string().trim().min(1).max(80).optional(),
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
  classification: invoiceClassificationSchema.default("outgoing"),
  confirmedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  customerBillingAddressLines: z.array(z.string()).nullable().default(null),
  customerEmail: z.string().email().nullable().default(null),
  customerName: z.string().nullable().default(null),
  customerPhone: z.string().nullable().default(null),
  customerTaxNumber: z.string().nullable().default(null),
  currencyCode: z.string().length(3),
  currencyScale: z.number().int().min(0).max(4),
  lines: z.array(invoiceLineItemResponseSchema),
  locationId: z.string().uuid(),
  notes: z.string().nullable(),
  parentInvoiceReference: z.string().nullable().default(null),
  paymentMethod: posPaymentMethodSchema.nullable(),
  reference: z.string(),
  replacementInvoiceReference: z.string().nullable().default(null),
  revisionChain: z
    .object({
      currentPayableReference: z.string().nullable().default(null),
      isLatestPayable: z.boolean().default(false),
      replacementInvoiceReference: z.string().nullable().default(null),
      revisionCreditNoteReference: z.string().nullable().default(null),
      revisionRootReference: z.string().nullable().default(null),
      sourceInvoiceReference: z.string().nullable().default(null),
    })
    .default({
      currentPayableReference: null,
      isLatestPayable: false,
      replacementInvoiceReference: null,
      revisionCreditNoteReference: null,
      revisionRootReference: null,
      sourceInvoiceReference: null,
    }),
  role: invoiceDocumentRoleSchema.default("standard"),
  status: z.enum(["confirmed", "superseded", "voided"]),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  type: z.enum([
    "pos",
    "portal",
    "ecommerce",
    "manual",
    "credit_note",
    "adjusted",
  ]),
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
  classification: invoiceClassificationFilterSchema.default("all"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  documentType: invoiceDocumentTypeFilterSchema.default("all"),
  locationId: z.string().uuid().optional(),
  q: z.string().trim().max(160).optional(),
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
export type InvoiceClassification = z.infer<typeof invoiceClassificationSchema>;
export type InvoiceClassificationFilter = z.infer<
  typeof invoiceClassificationFilterSchema
>;
export type InvoiceDocumentRole = z.infer<typeof invoiceDocumentRoleSchema>;
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
