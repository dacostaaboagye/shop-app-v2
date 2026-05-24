import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { auditColumns, publicUuidColumn } from "./common.js";
import { customerContacts, customers } from "./customers.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "pos",
  "portal",
  "ecommerce",
  "manual",
  "credit_note",
  "adjusted",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "confirmed",
  "superseded",
  "voided",
]);

export const invoiceClassificationEnum = pgEnum("invoice_classification", [
  "outgoing",
  "internal",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull().unique(),
    type: invoiceTypeEnum("type").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    attributedWorkerId: uuid("attributed_worker_id").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    paymentMethod: varchar("payment_method", { length: 50 }),
    customerName: varchar("customer_name", { length: 200 }),
    customerEmail: varchar("customer_email", { length: 160 }),
    customerPhone: varchar("customer_phone", { length: 80 }),
    customerTaxNumber: varchar("customer_tax_number", { length: 120 }),
    customerBillingAddressLines: jsonb("customer_billing_address_lines").$type<
      string[]
    >(),
    customerId: uuid("customer_id").references(() => customers.id),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
    ),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    currencyScale: integer("currency_scale").notNull(),
    classification: invoiceClassificationEnum("classification")
      .default("outgoing")
      .notNull(),
    status: invoiceStatusEnum("status").default("confirmed").notNull(),
    subtotalAmount: numeric("subtotal_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    parentInvoiceId: uuid("parent_invoice_id"),
    replacementInvoiceId: uuid("replacement_invoice_id"),
    revisionRootInvoiceId: uuid("revision_root_invoice_id"),
    revisionCreditNoteId: uuid("revision_credit_note_id"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("invoices_reference_unique").on(table.reference),
    index("invoices_location_status_idx").on(table.locationId, table.status),
    index("invoices_worker_idx").on(table.attributedWorkerId),
    index("invoices_type_location_idx").on(table.type, table.locationId),
    index("invoices_customer_idx").on(table.customerId),
    index("invoices_customer_contact_idx").on(table.customerContactId),
    index("invoices_created_at_idx").on(table.createdAt),
    check("invoices_subtotal_nonnegative", sql`${table.subtotalAmount} >= 0`),
    check("invoices_tax_nonnegative", sql`${table.taxAmount} >= 0`),
    check("invoices_total_nonnegative", sql`${table.totalAmount} >= 0`),
    check(
      "invoices_currency_scale_range",
      sql`${table.currencyScale} >= 0 and ${table.currencyScale} <= 4`,
    ),
  ],
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  location: one(locations, {
    fields: [invoices.locationId],
    references: [locations.id],
  }),
  attributedWorker: one(users, {
    fields: [invoices.attributedWorkerId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  customerContact: one(customerContacts, {
    fields: [invoices.customerContactId],
    references: [customerContacts.id],
  }),
  lines: many(invoiceLineItems),
  parentInvoice: one(invoices, {
    fields: [invoices.parentInvoiceId],
    references: [invoices.id],
  }),
  replacementInvoice: one(invoices, {
    fields: [invoices.replacementInvoiceId],
    references: [invoices.id],
    relationName: "invoice_replacement",
  }),
  revisionRootInvoice: one(invoices, {
    fields: [invoices.revisionRootInvoiceId],
    references: [invoices.id],
    relationName: "invoice_revision_root",
  }),
  revisionCreditNote: one(invoices, {
    fields: [invoices.revisionCreditNoteId],
    references: [invoices.id],
    relationName: "invoice_revision_credit_note",
  }),
}));

export type SkuSnapshot = {
  sku: string;
  variantName: string;
  productName: string;
};

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: publicUuidColumn(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),
    skuSnapshot: jsonb("sku_snapshot").$type<SkuSnapshot>().notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    taxCategory: varchar("tax_category", { length: 80 }),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    stockMovementId: uuid("stock_movement_id"),
    ...auditColumns,
  },
  (table) => [
    index("invoice_line_items_invoice_idx").on(table.invoiceId),
    index("invoice_line_items_sku_idx").on(table.skuId),
    check("invoice_line_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "invoice_line_items_unit_price_nonnegative",
      sql`${table.unitPrice} >= 0`,
    ),
  ],
);

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    variant: one(productVariants, {
      fields: [invoiceLineItems.skuId],
      references: [productVariants.id],
    }),
  }),
);
