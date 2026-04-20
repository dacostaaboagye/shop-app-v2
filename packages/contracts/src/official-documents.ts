import { z } from "zod";

export {
  officialDocumentTypeValues,
  supportedCurrencyCodes,
  supportedTimeZones,
} from "./official-document-options.js";

import {
  officialDocumentTypeValues,
  supportedCurrencyCodes,
  supportedTimeZones,
} from "./official-document-options.js";

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .toUpperCase()
  .refine((value) => supportedCurrencyCodes.includes(value), {
    message: "Select a supported ISO 4217 currency code.",
  });

const timeZoneSchema = z
  .string()
  .trim()
  .refine((value) => supportedTimeZones.includes(value), {
    message: "Select a supported IANA time zone.",
  });

export const documentBrandSettingsSchema = z.object({
  brandName: z.string().trim().min(1).max(160),
  logoText: z.string().trim().min(1).max(8),
  primaryColor: z.string().trim().min(1).max(80),
  accentColor: z.string().trim().min(1).max(80),
});

export const documentBusinessSettingsSchema = z.object({
  legalName: z.string().trim().min(1).max(200),
  registrationNumber: z.string().trim().min(1).max(120),
  taxNumber: z.string().trim().min(1).max(120),
  addressLines: z.array(z.string().trim().min(1).max(200)).max(4),
  phone: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  website: z.string().trim().min(1).max(160),
});

export const currencyRoundingModeSchema = z.enum([
  "half_up",
  "half_even",
  "floor",
  "ceiling",
]);

export const moneySettingsSchema = z.object({
  baseCurrencyCode: currencyCodeSchema,
  defaultDisplayCurrencyCode: currencyCodeSchema,
  currencyScale: z.number().int().min(0).max(4),
  roundingMode: currencyRoundingModeSchema,
  allowMultiCurrencySales: z.boolean(),
  allowExchangeRates: z.boolean(),
});

export const documentDefaultsSchema = z.object({
  defaultPaperSize: z.enum(["receipt_80mm", "a4", "letter"]),
  receiptFooter: z.string().trim().min(1).max(500),
  invoicePrefix: z.string().trim().min(1).max(20),
  receiptPrefix: z.string().trim().min(1).max(20),
  gtnPrefix: z.string().trim().min(1).max(20),
  locale: z.string().trim().min(2).max(40),
  timezone: timeZoneSchema,
});

export const locationOverridePolicySchema = z.object({
  allowLocationDisplayName: z.boolean(),
  allowLocationAddress: z.boolean(),
  allowLocationContact: z.boolean(),
  allowLocationFooter: z.boolean(),
  allowLocationPaperSize: z.boolean(),
  allowLocationNumberPrefix: z.boolean(),
});

export const officialDocumentTypeSchema = z.enum(officialDocumentTypeValues);

export const officialDocumentSettingsResponseSchema = z.object({
  brand: documentBrandSettingsSchema,
  business: documentBusinessSettingsSchema,
  currency: moneySettingsSchema,
  documents: documentDefaultsSchema,
  locationOverridePolicy: locationOverridePolicySchema,
  updatedAt: z.iso.datetime().nullable(),
  updatedByUserSlug: z.string().nullable(),
});

const updateBrandSettingsSchema = documentBrandSettingsSchema.partial();
const updateBusinessSettingsSchema = documentBusinessSettingsSchema.partial();
const updateMoneySettingsSchema = moneySettingsSchema.partial();
const updateDocumentDefaultsSchema = documentDefaultsSchema.partial();
const updateLocationOverridePolicySchema =
  locationOverridePolicySchema.partial();

export const updateOfficialDocumentSettingsRequestSchema = z.object({
  brand: updateBrandSettingsSchema.optional(),
  business: updateBusinessSettingsSchema.optional(),
  currency: updateMoneySettingsSchema.optional(),
  documents: updateDocumentDefaultsSchema.optional(),
  locationOverridePolicy: updateLocationOverridePolicySchema.optional(),
});

export const locationDocumentSettingsResponseSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string(),
  displayName: z.string().nullable(),
  addressLines: z.array(z.string()).nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  receiptFooter: z.string().nullable(),
  defaultPaperSize: z.enum(["receipt_80mm", "a4", "letter"]).nullable(),
  documentPrefix: z.string().nullable(),
  timezone: timeZoneSchema.nullable(),
  updatedAt: z.iso.datetime().nullable(),
  updatedByUserSlug: z.string().nullable(),
});

export const officialDocumentProfileQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
});

export const officialDocumentProfileResponseSchema = z.object({
  accentColor: z.string(),
  addressLines: z.array(z.string()),
  brandName: z.string(),
  currencyCode: currencyCodeSchema,
  currencyScale: z.number().int().min(0).max(4),
  documentPrefix: z.string().nullable(),
  email: z.string(),
  footer: z.string(),
  legalName: z.string(),
  locale: z.string(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
  logoText: z.string(),
  paperSize: z.enum(["receipt_80mm", "a4", "letter"]),
  phone: z.string(),
  primaryColor: z.string(),
  registrationNumber: z.string(),
  taxNumber: z.string(),
  timezone: timeZoneSchema,
  website: z.string(),
});

export const issuedDocumentSnapshotResponseSchema = z.object({
  contentHash: z.string(),
  documentReference: z.string(),
  documentType: officialDocumentTypeSchema,
  issuedAt: z.iso.datetime(),
  locationId: z.string().uuid().nullable(),
  payloadSnapshot: z.record(z.string(), z.unknown()),
  profileSnapshot: officialDocumentProfileResponseSchema,
  resourceKind: z.string(),
  resourceReference: z.string(),
  schemaVersion: z.string(),
});

export const issuedSalesDocumentSnapshotParamsSchema = z.object({
  reference: z.string().trim().min(1).max(120),
});

export const updateLocationDocumentSettingsRequestSchema = z.object({
  addressLines: z
    .array(z.string().trim().min(1).max(200))
    .max(4)
    .nullable()
    .optional(),
  defaultPaperSize: z
    .enum(["receipt_80mm", "a4", "letter"])
    .nullable()
    .optional(),
  displayName: z.string().trim().min(1).max(160).nullable().optional(),
  documentPrefix: z.string().trim().min(1).max(20).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  phone: z.string().trim().min(1).max(80).nullable().optional(),
  receiptFooter: z.string().trim().min(1).max(500).nullable().optional(),
  timezone: timeZoneSchema.nullable().optional(),
});

export type OfficialDocumentSettingsResponse = z.infer<
  typeof officialDocumentSettingsResponseSchema
>;
export type UpdateOfficialDocumentSettingsRequest = z.infer<
  typeof updateOfficialDocumentSettingsRequestSchema
>;
export type LocationDocumentSettingsResponse = z.infer<
  typeof locationDocumentSettingsResponseSchema
>;
export type OfficialDocumentProfileQuery = z.infer<
  typeof officialDocumentProfileQuerySchema
>;
export type OfficialDocumentProfileResponse = z.infer<
  typeof officialDocumentProfileResponseSchema
>;
export type IssuedDocumentSnapshotResponse = z.infer<
  typeof issuedDocumentSnapshotResponseSchema
>;
export type IssuedSalesDocumentSnapshotParams = z.infer<
  typeof issuedSalesDocumentSnapshotParamsSchema
>;
export type OfficialDocumentType = z.infer<typeof officialDocumentTypeSchema>;
export type UpdateLocationDocumentSettingsRequest = z.infer<
  typeof updateLocationDocumentSettingsRequestSchema
>;
