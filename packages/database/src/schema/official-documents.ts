import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export type DocumentBrandSettings = {
  brandName: string;
  logoText: string;
  primaryColor: string;
  accentColor: string;
};

export type DocumentBusinessSettings = {
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
  addressLines: string[];
  phone: string;
  email: string;
  website: string;
};

export type MoneySettings = {
  baseCurrencyCode: string;
  defaultDisplayCurrencyCode: string;
  currencyScale: number;
  roundingMode: "half_up" | "half_even" | "floor" | "ceiling";
  allowMultiCurrencySales: boolean;
  allowExchangeRates: boolean;
};

export type DocumentDefaults = {
  defaultPaperSize: "receipt_80mm" | "a4" | "letter";
  receiptFooter: string;
  invoicePrefix: string;
  receiptPrefix: string;
  gtnPrefix: string;
  locale: string;
  timezone: string;
};

export type LocationOverridePolicy = {
  allowLocationDisplayName: boolean;
  allowLocationAddress: boolean;
  allowLocationContact: boolean;
  allowLocationFooter: boolean;
  allowLocationPaperSize: boolean;
  allowLocationNumberPrefix: boolean;
};

export type EmailTemplateSettings = {
  supplierInvite: EmailTemplateDefinition;
  passwordReset: EmailTemplateDefinition;
  emailVerification: EmailTemplateDefinition;
};

export type EmailTemplateDefinition = {
  subject: string;
  heading: string;
  intro: string;
  actionLabel: string;
  footer: string;
};

export type IssuedDocumentProfileSnapshot = {
  brandName: string;
  logoImageUrl: string | null;
  logoText: string;
  primaryColor: string;
  accentColor: string;
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
  addressLines: string[];
  phone: string;
  email: string;
  website: string;
  currencyCode: string;
  currencyScale: number;
  locale: string;
  timezone: string;
  paperSize: "receipt_80mm" | "a4" | "letter";
  footer: string;
  locationId: string | null;
  locationName: string | null;
  documentPrefix: string | null;
};

export type IssuedDocumentPayloadSnapshot = Record<string, unknown>;

export const officialDocumentTypeEnum = pgEnum("official_document_type", [
  "sales_receipt",
  "sales_invoice",
  "credit_note",
  "refund_note",
  "goods_transfer_note",
  "dispatch_note",
  "stock_adjustment",
  "stock_count",
  "purchase_order",
  "supplier_invoice",
]);

export const officialDocumentSettings = pgTable(
  "official_document_settings",
  {
    id: publicUuidColumn(),
    settingsKey: varchar("settings_key", { length: 60 }).notNull().unique(),
    brand: jsonb("brand").$type<DocumentBrandSettings>().notNull(),
    business: jsonb("business").$type<DocumentBusinessSettings>().notNull(),
    currency: jsonb("currency").$type<MoneySettings>().notNull(),
    documents: jsonb("documents").$type<DocumentDefaults>().notNull(),
    emailTemplates: jsonb("email_templates")
      .$type<EmailTemplateSettings>()
      .notNull(),
    locationOverridePolicy: jsonb("location_override_policy")
      .$type<LocationOverridePolicy>()
      .notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("official_document_settings_key_idx").on(table.settingsKey),
  ],
);

export const locationDocumentSettings = pgTable(
  "location_document_settings",
  {
    id: publicUuidColumn(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id)
      .unique(),
    displayName: varchar("display_name", { length: 160 }),
    addressLines: jsonb("address_lines").$type<string[]>(),
    phone: varchar("phone", { length: 80 }),
    email: varchar("email", { length: 160 }),
    receiptFooter: text("receipt_footer"),
    defaultPaperSize: varchar("default_paper_size", { length: 40 }),
    documentPrefix: varchar("document_prefix", { length: 20 }),
    timezone: varchar("timezone", { length: 80 }),
    updatedBy: uuid("updated_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("location_document_settings_location_idx").on(table.locationId),
  ],
);

export const issuedDocuments = pgTable(
  "issued_documents",
  {
    id: publicUuidColumn(),
    documentReference: varchar("document_reference", { length: 80 })
      .notNull()
      .unique(),
    documentType: officialDocumentTypeEnum("document_type").notNull(),
    resourceKind: varchar("resource_kind", { length: 80 }).notNull(),
    resourceReference: varchar("resource_reference", { length: 120 }).notNull(),
    locationId: uuid("location_id").references(() => locations.id),
    issuedBy: uuid("issued_by").references(() => users.id),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    profileSnapshot: jsonb("profile_snapshot")
      .$type<IssuedDocumentProfileSnapshot>()
      .notNull(),
    payloadSnapshot: jsonb("payload_snapshot")
      .$type<IssuedDocumentPayloadSnapshot>()
      .notNull(),
    contentHash: varchar("content_hash", { length: 128 }).notNull(),
    schemaVersion: varchar("schema_version", { length: 40 })
      .default("official-document-v1")
      .notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("issued_documents_resource_type_unique").on(
      table.resourceKind,
      table.resourceReference,
      table.documentType,
    ),
    index("issued_documents_location_issued_idx").on(
      table.locationId,
      table.issuedAt,
    ),
    index("issued_documents_resource_idx").on(
      table.resourceKind,
      table.resourceReference,
    ),
  ],
);

export const officialDocumentSettingsRelations = relations(
  officialDocumentSettings,
  ({ one }) => ({
    updatedByUser: one(users, {
      fields: [officialDocumentSettings.updatedBy],
      references: [users.id],
    }),
  }),
);

export const locationDocumentSettingsRelations = relations(
  locationDocumentSettings,
  ({ one }) => ({
    location: one(locations, {
      fields: [locationDocumentSettings.locationId],
      references: [locations.id],
    }),
    updatedByUser: one(users, {
      fields: [locationDocumentSettings.updatedBy],
      references: [users.id],
    }),
  }),
);

export const issuedDocumentsRelations = relations(
  issuedDocuments,
  ({ one }) => ({
    issuedByUser: one(users, {
      fields: [issuedDocuments.issuedBy],
      references: [users.id],
    }),
    location: one(locations, {
      fields: [issuedDocuments.locationId],
      references: [locations.id],
    }),
  }),
);
