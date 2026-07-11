import { z } from "zod";
import { posPaymentMethodSchema } from "./sales.js";

export const manualInvoiceRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const manualInvoiceRequestStatusFilterSchema = z.enum([
  "all",
  "pending",
  "approved",
  "rejected",
]);

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative money amount.");

export const manualInvoiceRequestLineInputSchema = z.object({
  quantity: z.number().int().min(1),
  skuId: z.string().uuid(),
  unitPrice: moneyStringSchema,
});

export const createManualInvoiceRequestSchema = z
  .object({
    customerBillingAddressLines: z.array(z.string().trim().min(1)).optional(),
    customerContactReference: z.string().trim().min(1).max(25).optional(),
    customerEmail: z.string().trim().email().optional(),
    customerName: z.string().trim().min(1).max(160).optional(),
    customerPhone: z.string().trim().min(1).max(40).optional(),
    customerSlug: z.string().trim().min(1).max(120).optional(),
    customerTaxNumber: z.string().trim().min(1).max(80).optional(),
    lines: z.array(manualInvoiceRequestLineInputSchema).min(1),
    locationId: z.string().uuid(),
    paymentMethod: posPaymentMethodSchema.optional(),
    reason: z.string().trim().min(1).max(500),
    supportingNote: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.customerContactReference && !value.customerSlug) {
      ctx.addIssue({
        code: "custom",
        message: "Customer contact requires a selected CRM customer.",
        path: ["customerContactReference"],
      });
    }
    if (value.customerName || value.customerSlug) return;
    ctx.addIssue({
      code: "custom",
      message: "Customer name is required when no CRM customer is selected.",
      path: ["customerName"],
    });
  });

export const manualInvoiceRequestListQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(160).optional(),
  status: manualInvoiceRequestStatusFilterSchema.default("all"),
});

export const managerCustomerLookupQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(10),
  q: z.string().trim().max(120).default(""),
});

export const managerCustomerLookupContactSchema = z.object({
  contactReference: z.string().min(1).max(25),
  email: z.email().nullable(),
  name: z.string().min(1).max(180),
  phone: z.string().max(80).nullable(),
  receivesInvoices: z.boolean(),
});

export const managerCustomerLookupItemSchema = z.object({
  billingAddressLines: z.array(z.string()).nullable(),
  contacts: z.array(managerCustomerLookupContactSchema),
  displayName: z.string().min(1).max(180),
  reference: z.string().min(1).max(25),
  slug: z.string().min(1).max(120),
  taxNumber: z.string().max(120).nullable(),
});

export const managerCustomerLookupResponseSchema = z.object({
  items: z.array(managerCustomerLookupItemSchema),
});

export const decideManualInvoiceRequestSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const rejectManualInvoiceRequestSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const manualInvoiceRequestLineResponseSchema = z.object({
  lineTotal: z.string(),
  quantity: z.number().int(),
  skuId: z.string().uuid(),
  skuSnapshot: z.object({
    productName: z.string(),
    sku: z.string(),
    variantName: z.string(),
  }),
  taxAmount: z.string(),
  taxCategory: z.string().nullable(),
  taxRate: z.string().nullable(),
  unitPrice: z.string(),
});

export const manualInvoiceRequestResponseSchema = z.object({
  approvedAt: z.iso.datetime().nullable(),
  approvedByName: z.string().nullable(),
  approvedInvoiceReference: z.string().nullable(),
  createdAt: z.iso.datetime(),
  currencyCode: z.string().length(3),
  currencyScale: z.number().int().min(0).max(4),
  customerBillingAddressLines: z.array(z.string()).nullable(),
  customerContactReference: z.string().nullable(),
  customerEmail: z.string().email().nullable(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  customerReference: z.string().nullable(),
  customerSlug: z.string().nullable(),
  customerTaxNumber: z.string().nullable(),
  lines: z.array(manualInvoiceRequestLineResponseSchema),
  locationId: z.string().uuid(),
  locationName: z.string().nullable(),
  paymentMethod: posPaymentMethodSchema.nullable(),
  reason: z.string(),
  reference: z.string(),
  rejectedAt: z.iso.datetime().nullable(),
  rejectedByName: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  requestedByName: z.string().nullable(),
  status: manualInvoiceRequestStatusSchema,
  subtotalAmount: z.string(),
  supportingNote: z.string().nullable(),
  taxAmount: z.string(),
  totalAmount: z.string(),
  updatedAt: z.iso.datetime(),
});

export const manualInvoiceRequestListResponseSchema = z.object({
  items: z.array(manualInvoiceRequestResponseSchema.omit({ lines: true })),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type CreateManualInvoiceRequest = z.infer<
  typeof createManualInvoiceRequestSchema
>;
export type DecideManualInvoiceRequest = z.infer<
  typeof decideManualInvoiceRequestSchema
>;
export type ManualInvoiceRequestListQuery = z.infer<
  typeof manualInvoiceRequestListQuerySchema
>;
export type ManualInvoiceRequestListResponse = z.infer<
  typeof manualInvoiceRequestListResponseSchema
>;
export type ManagerCustomerLookupQuery = z.infer<
  typeof managerCustomerLookupQuerySchema
>;
export type ManagerCustomerLookupContact = z.infer<
  typeof managerCustomerLookupContactSchema
>;
export type ManagerCustomerLookupItem = z.infer<
  typeof managerCustomerLookupItemSchema
>;
export type ManagerCustomerLookupResponse = z.infer<
  typeof managerCustomerLookupResponseSchema
>;
export type ManualInvoiceRequestResponse = z.infer<
  typeof manualInvoiceRequestResponseSchema
>;
export type ManualInvoiceRequestStatus = z.infer<
  typeof manualInvoiceRequestStatusSchema
>;
export type RejectManualInvoiceRequest = z.infer<
  typeof rejectManualInvoiceRequestSchema
>;
