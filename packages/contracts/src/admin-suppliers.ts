import { z } from "zod";
import { adminSupplierProcurementOrderSchema } from "./admin-supplier-procurement.js";

export type {
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierProcurementReceiveRequest,
  AdminSupplierProcurementStatus,
  AdminSupplierProcurementTransitionRequest,
} from "./admin-supplier-procurement.js";
export {
  adminCreateSupplierProcurementOrderRequestSchema,
  adminSupplierProcurementLineSchema,
  adminSupplierProcurementOrderSchema,
  adminSupplierProcurementReceiveRequestSchema,
  adminSupplierProcurementStatusSchema,
  adminSupplierProcurementTransitionRequestSchema,
} from "./admin-supplier-procurement.js";

export const adminSupplierStatusSchema = z.enum(["active", "inactive"]);

export const adminSupplierSortSchema = z.enum(["name", "status", "createdAt"]);

export const adminSupplierListQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(120).default(""),
  sort: adminSupplierSortSchema.default("name"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
});

export const adminSupplierPrimaryContactSchema = z.object({
  email: z.email().nullable(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  phone: z.string().max(80).nullable(),
  userSlug: z.string().min(1).max(120).nullable(),
});

export const adminSupplierSummarySchema = z.object({
  contactCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  email: z.email().nullable(),
  legalName: z.string().max(220).nullable(),
  linkedUserCount: z.number().int().min(0),
  name: z.string().min(1).max(180),
  paymentTermsDays: z.number().int().min(0),
  phone: z.string().max(80).nullable(),
  primaryContact: adminSupplierPrimaryContactSchema.nullable(),
  primaryImageUrl: z.string().nullable().optional(),
  slug: z.string().min(1).max(120),
  status: adminSupplierStatusSchema,
  taxId: z.string().max(120).nullable(),
  website: z.string().max(500).nullable(),
});

export const adminSupplierContactSchema = z.object({
  contactReference: z.string().uuid(),
  email: z.email().nullable(),
  firstName: z.string().min(1).max(120),
  isPrimary: z.boolean(),
  jobTitle: z.string().max(160).nullable(),
  lastName: z.string().min(1).max(120),
  phone: z.string().max(80).nullable(),
  portalStatus: z.enum(["none", "invited", "linked", "inactive"]),
  status: z.enum(["active", "inactive"]),
  userSlug: z.string().min(1).max(120).nullable(),
});

export const adminSupplierProductSchema = z.object({
  brandName: z.string().max(160).nullable(),
  categoryName: z.string().max(160).nullable(),
  isPreferred: z.boolean(),
  lastCostPrice: z.string().nullable(),
  leadTimeDays: z.number().int().min(0),
  minimumOrderQuantity: z.number().int().min(1),
  productName: z.string().min(1).max(200),
  productSlug: z.string().min(1).max(120),
  supplierProductCode: z.string().max(120).nullable(),
  variantCount: z.number().int().min(0),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1).max(80),
        variantName: z.string().min(1).max(160),
        variantSlug: z.string().min(1).max(120),
      }),
    )
    .default([]),
});

export const adminSupplierInquirySchema = z.object({
  attachmentMimeType: z.string().max(100).nullable(),
  attachmentName: z.string().max(255).nullable(),
  attachmentUrl: z.string().max(1000).nullable(),
  createdAt: z.iso.datetime(),
  message: z.string(),
  neededBy: z.iso.datetime().nullable(),
  productName: z.string().max(200).nullable(),
  productSlug: z.string().max(120).nullable(),
  reference: z.string().min(1).max(25),
  requestedProductName: z.string().max(200).nullable(),
  requestedQuantity: z.number().int().min(1).nullable(),
  status: z.enum(["sent", "responded", "converted", "cancelled"]),
  supplierResponse: z.string().nullable(),
});

export const adminSupplierTransactionSchema = z.object({
  amount: z.string().nullable(),
  currencyCode: z.string().length(3).nullable(),
  description: z.string().nullable(),
  occurredAt: z.iso.datetime(),
  reference: z.string().min(1).max(120),
  relatedDocumentReference: z.string().max(120).nullable(),
  relatedDocumentType: z.string().max(80).nullable(),
  status: z.string().max(80).nullable(),
  transactionType: z.enum([
    "purchase_order",
    "supplier_invoice",
    "goods_receipt",
    "payment",
    "return",
    "credit_note",
  ]),
});

export const adminSupplierDetailSchema = adminSupplierSummarySchema.extend({
  contacts: z.array(adminSupplierContactSchema).default([]),
  inquiries: z.array(adminSupplierInquirySchema).default([]),
  procurementOrders: z.array(adminSupplierProcurementOrderSchema).default([]),
  products: z.array(adminSupplierProductSchema).default([]),
  recentTransactions: z.array(adminSupplierTransactionSchema).default([]),
});

export const adminSupplierListResponseSchema = z.object({
  items: z.array(adminSupplierSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminCreateSupplierRequestSchema = z.object({
  email: z.email().nullable().optional(),
  legalName: z.string().trim().max(220).nullable().optional(),
  name: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(4000).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(0),
  phone: z.string().trim().max(80).nullable().optional(),
  status: adminSupplierStatusSchema.default("active"),
  taxId: z.string().trim().max(120).nullable().optional(),
  website: z.string().trim().max(500).nullable().optional(),
});

export const adminUpdateSupplierRequestSchema =
  adminCreateSupplierRequestSchema.partial();

export const adminCreateSupplierContactRequestSchema = z.object({
  email: z.email().nullable().optional(),
  firstName: z.string().trim().min(1).max(120),
  isPrimary: z.boolean().default(false),
  jobTitle: z.string().trim().max(160).nullable().optional(),
  lastName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(80).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  userSlug: z.string().trim().max(120).nullable().optional(),
});

export const adminLinkSupplierContactPortalRequestSchema = z.object({
  userSlug: z.string().trim().min(1).max(120),
});

export const adminLinkSupplierProductRequestSchema = z.object({
  isPreferred: z.boolean().default(false),
  lastCostPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable()
    .optional(),
  leadTimeDays: z.number().int().min(0).max(365).default(0),
  minimumOrderQuantity: z.number().int().min(1).default(1),
  notes: z.string().trim().max(2000).nullable().optional(),
  productSlug: z.string().trim().min(1).max(120),
  supplierProductCode: z.string().trim().max(120).nullable().optional(),
});

export const adminCreateSupplierInquiryRequestSchema = z
  .object({
    attachmentMimeType: z.string().trim().max(100).nullable().optional(),
    attachmentName: z.string().trim().max(255).nullable().optional(),
    attachmentUrl: z.string().trim().max(1000).nullable().optional(),
    message: z.string().trim().min(1).max(4000),
    neededBy: z.iso.datetime().nullable().optional(),
    productSlug: z.string().trim().max(120).nullable().optional(),
    requestedProductName: z.string().trim().max(200).nullable().optional(),
    requestedQuantity: z.number().int().min(1).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.productSlug || value.requestedProductName?.trim()) return;
    context.addIssue({
      code: "custom",
      message: "Select a catalogue product or enter the item to source.",
      path: ["requestedProductName"],
    });
  });

export const adminUpdateSupplierInquiryRequestSchema = z.object({
  status: z.enum(["converted", "cancelled"]),
});

export type AdminSupplierListQuery = z.infer<
  typeof adminSupplierListQuerySchema
>;
export type AdminSupplierListResponse = z.infer<
  typeof adminSupplierListResponseSchema
>;
export type AdminSupplierSummary = z.infer<typeof adminSupplierSummarySchema>;
export type AdminSupplierDetail = z.infer<typeof adminSupplierDetailSchema>;
export type AdminSupplierInquiry = z.infer<typeof adminSupplierInquirySchema>;
export type AdminCreateSupplierRequest = z.infer<
  typeof adminCreateSupplierRequestSchema
>;
export type AdminUpdateSupplierRequest = z.infer<
  typeof adminUpdateSupplierRequestSchema
>;
export type AdminCreateSupplierContactRequest = z.infer<
  typeof adminCreateSupplierContactRequestSchema
>;
export type AdminLinkSupplierContactPortalRequest = z.infer<
  typeof adminLinkSupplierContactPortalRequestSchema
>;
export type AdminLinkSupplierProductRequest = z.infer<
  typeof adminLinkSupplierProductRequestSchema
>;
export type AdminCreateSupplierInquiryRequest = z.infer<
  typeof adminCreateSupplierInquiryRequestSchema
>;
export type AdminUpdateSupplierInquiryRequest = z.infer<
  typeof adminUpdateSupplierInquiryRequestSchema
>;
export type AdminSupplierStatus = z.infer<typeof adminSupplierStatusSchema>;
