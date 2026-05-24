import { z } from "zod";
import {
  customerSafeInvoiceLineItemResponseSchema,
  invoiceDocumentTypeFilterSchema,
  invoiceResponseSchema,
  invoiceStatusFilterSchema,
} from "./sales.js";

const queryBooleanSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

export const customerInvoiceListQuerySchema = z.object({
  currentPayableOnly: queryBooleanSchema.default(false),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  documentType: invoiceDocumentTypeFilterSchema.default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(160).optional(),
  status: invoiceStatusFilterSchema.default("all"),
});

export const customerInvoiceResponseSchema = invoiceResponseSchema
  .pick({
    classification: true,
    confirmedAt: true,
    createdAt: true,
    currencyCode: true,
    currencyScale: true,
    customerBillingAddressLines: true,
    customerContactReference: true,
    customerEmail: true,
    customerName: true,
    customerPhone: true,
    customerReference: true,
    customerSlug: true,
    customerTaxNumber: true,
    notes: true,
    parentInvoiceReference: true,
    paymentMethod: true,
    reference: true,
    replacementInvoiceReference: true,
    revisionChain: true,
    role: true,
    status: true,
    subtotalAmount: true,
    taxAmount: true,
    totalAmount: true,
    type: true,
  })
  .extend({
    lines: z.array(customerSafeInvoiceLineItemResponseSchema),
  });

export const customerInvoiceListItemResponseSchema =
  customerInvoiceResponseSchema.omit({ lines: true });

export const customerInvoiceListResponseSchema = z.object({
  items: z.array(customerInvoiceListItemResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type CustomerInvoiceListQuery = z.infer<
  typeof customerInvoiceListQuerySchema
>;
export type CustomerInvoiceResponse = z.infer<
  typeof customerInvoiceResponseSchema
>;
export type CustomerInvoiceListItemResponse = z.infer<
  typeof customerInvoiceListItemResponseSchema
>;
export type CustomerInvoiceListResponse = z.infer<
  typeof customerInvoiceListResponseSchema
>;
