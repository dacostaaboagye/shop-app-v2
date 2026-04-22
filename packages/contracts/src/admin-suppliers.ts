import { z } from "zod";

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
  email: z.email().nullable(),
  firstName: z.string().min(1).max(120),
  isPrimary: z.boolean(),
  jobTitle: z.string().max(160).nullable(),
  lastName: z.string().min(1).max(120),
  phone: z.string().max(80).nullable(),
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

export const adminSupplierProcurementStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
  "closed",
]);

export const adminSupplierProcurementLineSchema = z.object({
  approvedQuantity: z.number().int().min(1).nullable(),
  productName: z.string().min(1).max(200),
  productSlug: z.string().min(1).max(120),
  receivedQuantity: z.number().int().min(0),
  requestedQuantity: z.number().int().min(1),
  sku: z.string().min(1).max(80),
  unitCost: z.string().nullable(),
  variantName: z.string().min(1).max(160),
  variantSlug: z.string().min(1).max(120),
});

export const adminSupplierProcurementOrderSchema = z.object({
  approvedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  destinationLocationName: z.string().max(160).nullable(),
  destinationLocationSlug: z.string().max(120).nullable(),
  expectedAt: z.iso.datetime().nullable(),
  lines: z.array(adminSupplierProcurementLineSchema).default([]),
  notes: z.string().nullable(),
  orderedAt: z.iso.datetime().nullable(),
  receivedAt: z.iso.datetime().nullable(),
  reference: z.string().min(1).max(25),
  status: adminSupplierProcurementStatusSchema,
});

export const adminSupplierDetailSchema = adminSupplierSummarySchema.extend({
  contacts: z.array(adminSupplierContactSchema).default([]),
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

export const adminCreateSupplierProcurementOrderRequestSchema = z.object({
  destinationLocationSlug: z.string().trim().max(120).nullable().optional(),
  expectedAt: z.iso.datetime().nullable().optional(),
  lines: z
    .array(
      z.object({
        requestedQuantity: z.number().int().min(1),
        variantSlug: z.string().trim().min(1).max(120),
        unitCost: z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/)
          .nullable()
          .optional(),
      }),
    )
    .min(1),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const adminSupplierProcurementTransitionRequestSchema = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const adminSupplierProcurementReceiveRequestSchema = z.object({
  lines: z
    .array(
      z.object({
        receivedQuantity: z.number().int().min(0),
        variantSlug: z.string().trim().min(1).max(120),
      }),
    )
    .min(1),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type AdminSupplierListQuery = z.infer<
  typeof adminSupplierListQuerySchema
>;
export type AdminSupplierListResponse = z.infer<
  typeof adminSupplierListResponseSchema
>;
export type AdminSupplierSummary = z.infer<typeof adminSupplierSummarySchema>;
export type AdminSupplierDetail = z.infer<typeof adminSupplierDetailSchema>;
export type AdminSupplierProcurementStatus = z.infer<
  typeof adminSupplierProcurementStatusSchema
>;
export type AdminCreateSupplierRequest = z.infer<
  typeof adminCreateSupplierRequestSchema
>;
export type AdminUpdateSupplierRequest = z.infer<
  typeof adminUpdateSupplierRequestSchema
>;
export type AdminCreateSupplierContactRequest = z.infer<
  typeof adminCreateSupplierContactRequestSchema
>;
export type AdminLinkSupplierProductRequest = z.infer<
  typeof adminLinkSupplierProductRequestSchema
>;
export type AdminCreateSupplierProcurementOrderRequest = z.infer<
  typeof adminCreateSupplierProcurementOrderRequestSchema
>;
export type AdminSupplierProcurementTransitionRequest = z.infer<
  typeof adminSupplierProcurementTransitionRequestSchema
>;
export type AdminSupplierProcurementReceiveRequest = z.infer<
  typeof adminSupplierProcurementReceiveRequestSchema
>;
export type AdminSupplierStatus = z.infer<typeof adminSupplierStatusSchema>;
