import { z } from "zod";

export const adminCustomerTypeSchema = z.enum(["individual", "business"]);
export const adminCustomerStatusSchema = z.enum([
  "active",
  "inactive",
  "blocked",
]);
export const adminCustomerContactStatusSchema = z.enum(["active", "inactive"]);
export const adminCustomerPortalStatusSchema = z.enum([
  "none",
  "linked",
  "inactive",
]);
export const adminCustomerAddressTypeSchema = z.enum([
  "billing",
  "shipping",
  "both",
]);
export const adminCustomerSortSchema = z.enum([
  "displayName",
  "status",
  "createdAt",
]);

export const adminCustomerListQuerySchema = z.object({
  dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(120).default(""),
  sort: adminCustomerSortSchema.default("displayName"),
  status: z.enum(["all", "active", "inactive", "blocked"]).default("all"),
  type: z.enum(["all", "individual", "business"]).default("all"),
});

export const adminCustomerContactSchema = z.object({
  contactReference: z.string().min(1).max(25),
  email: z.email().nullable(),
  isPrimary: z.boolean(),
  name: z.string().min(1).max(180),
  phone: z.string().max(80).nullable(),
  portalStatus: adminCustomerPortalStatusSchema,
  receivesDeliveryUpdates: z.boolean(),
  receivesInvoices: z.boolean(),
  roleTitle: z.string().max(160).nullable(),
  status: adminCustomerContactStatusSchema,
  userSlug: z.string().min(1).max(120).nullable(),
});

export const adminCustomerAddressSchema = z.object({
  addressLines: z.array(z.string().min(1)),
  addressReference: z.string().min(1).max(25),
  city: z.string().max(120).nullable(),
  countryCode: z.string().length(2).nullable(),
  isDefaultBilling: z.boolean(),
  isDefaultShipping: z.boolean(),
  label: z.string().min(1).max(120),
  recipientName: z.string().max(180).nullable(),
  recipientPhone: z.string().max(80).nullable(),
  region: z.string().max(120).nullable(),
  status: adminCustomerStatusSchema,
  type: adminCustomerAddressTypeSchema,
});

export const adminCustomerEventSchema = z.object({
  eventType: z.enum([
    "customer_created",
    "customer_updated",
    "contact_added",
    "address_added",
    "note_added",
    "portal_linked",
    "portal_unlinked",
  ]),
  occurredAt: z.iso.datetime(),
  summary: z.string().min(1),
});

export const adminCustomerPrimaryContactSchema = z.object({
  contactReference: z.string().min(1).max(25),
  email: z.email().nullable(),
  name: z.string().min(1).max(180),
  phone: z.string().max(80).nullable(),
});

export const adminCustomerSummarySchema = z.object({
  addressCount: z.number().int().min(0),
  contactCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
  customerType: adminCustomerTypeSchema,
  defaultCurrencyCode: z.string().length(3).nullable(),
  displayName: z.string().min(1).max(180),
  legalName: z.string().max(220).nullable(),
  paymentTermsDays: z.number().int().min(0),
  primaryContact: adminCustomerPrimaryContactSchema.nullable(),
  reference: z.string().min(1).max(25),
  slug: z.string().min(1).max(120),
  status: adminCustomerStatusSchema,
  taxNumber: z.string().max(120).nullable(),
});

export const adminCustomerDetailSchema = adminCustomerSummarySchema.extend({
  addresses: z.array(adminCustomerAddressSchema).default([]),
  contacts: z.array(adminCustomerContactSchema).default([]),
  creditLimitAmount: z.string().nullable(),
  events: z.array(adminCustomerEventSchema).default([]),
  notes: z.string().nullable(),
});

export const adminCustomerListResponseSchema = z.object({
  items: z.array(adminCustomerSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminCreateCustomerRequestSchema = z.object({
  creditLimitAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable()
    .optional(),
  customerType: adminCustomerTypeSchema.default("business"),
  defaultCurrencyCode: z.string().trim().length(3).nullable().optional(),
  displayName: z.string().trim().min(1).max(180),
  legalName: z.string().trim().max(220).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).max(365).default(0),
  status: adminCustomerStatusSchema.default("active"),
  taxNumber: z.string().trim().max(120).nullable().optional(),
});

export const adminUpdateCustomerRequestSchema =
  adminCreateCustomerRequestSchema.partial();

export const adminCreateCustomerContactRequestSchema = z.object({
  email: z.email().nullable().optional(),
  isPrimary: z.boolean().default(false),
  name: z.string().trim().min(1).max(180),
  phone: z.string().trim().max(80).nullable().optional(),
  receivesDeliveryUpdates: z.boolean().default(false),
  receivesInvoices: z.boolean().default(false),
  roleTitle: z.string().trim().max(160).nullable().optional(),
  status: adminCustomerContactStatusSchema.default("active"),
});

export const adminCreateCustomerAddressRequestSchema = z.object({
  addressLines: z.array(z.string().trim().min(1)).min(1).max(8),
  city: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().trim().length(2).nullable().optional(),
  isDefaultBilling: z.boolean().default(false),
  isDefaultShipping: z.boolean().default(false),
  label: z.string().trim().min(1).max(120),
  recipientName: z.string().trim().max(180).nullable().optional(),
  recipientPhone: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  type: adminCustomerAddressTypeSchema,
});

export const adminLinkCustomerContactPortalRequestSchema = z.object({
  userSlug: z.string().trim().min(1).max(120),
});

export type AdminCustomerListQuery = z.infer<
  typeof adminCustomerListQuerySchema
>;
export type AdminCustomerListResponse = z.infer<
  typeof adminCustomerListResponseSchema
>;
export type AdminCustomerSummary = z.infer<typeof adminCustomerSummarySchema>;
export type AdminCustomerDetail = z.infer<typeof adminCustomerDetailSchema>;
export type AdminCreateCustomerRequest = z.infer<
  typeof adminCreateCustomerRequestSchema
>;
export type AdminUpdateCustomerRequest = z.infer<
  typeof adminUpdateCustomerRequestSchema
>;
export type AdminCreateCustomerContactRequest = z.infer<
  typeof adminCreateCustomerContactRequestSchema
>;
export type AdminCreateCustomerAddressRequest = z.infer<
  typeof adminCreateCustomerAddressRequestSchema
>;
export type AdminLinkCustomerContactPortalRequest = z.infer<
  typeof adminLinkCustomerContactPortalRequestSchema
>;
