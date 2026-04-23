import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { catalogProducts } from "./catalog.js";
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";

export const supplierStatusEnum = pgEnum("supplier_status", [
  "active",
  "inactive",
]);

export const supplierContactStatusEnum = pgEnum("supplier_contact_status", [
  "active",
  "inactive",
]);

export const supplierTransactionTypeEnum = pgEnum("supplier_transaction_type", [
  "purchase_order",
  "supplier_invoice",
  "goods_receipt",
  "payment",
  "return",
  "credit_note",
]);

export const supplierInquiryStatusEnum = pgEnum("supplier_inquiry_status", [
  "sent",
  "responded",
  "converted",
  "cancelled",
]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    legalName: varchar("legal_name", { length: 220 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 80 }),
    website: varchar("website", { length: 500 }),
    taxId: varchar("tax_id", { length: 120 }),
    paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
    status: supplierStatusEnum("status").default("active").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("suppliers_status_idx").on(table.status),
    uniqueIndex("suppliers_name_unique").on(table.name),
  ],
);

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: publicUuidColumn(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProducts.id, { onDelete: "cascade" }),
    supplierProductCode: varchar("supplier_product_code", { length: 120 }),
    leadTimeDays: integer("lead_time_days").default(0).notNull(),
    minimumOrderQuantity: integer("minimum_order_quantity")
      .default(1)
      .notNull(),
    lastCostPrice: numeric("last_cost_price", { precision: 12, scale: 2 }),
    notes: text("notes"),
    isPreferred: boolean("is_preferred").default(false).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("supplier_products_supplier_idx").on(table.supplierId),
    index("supplier_products_product_idx").on(table.productId),
    uniqueIndex("supplier_products_supplier_product_unique").on(
      table.supplierId,
      table.productId,
    ),
  ],
);

export const supplierTransactions = pgTable(
  "supplier_transactions",
  {
    id: publicUuidColumn(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    transactionType: supplierTransactionTypeEnum("transaction_type").notNull(),
    reference: varchar("reference", { length: 120 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    currencyCode: varchar("currency_code", { length: 3 }),
    status: varchar("status", { length: 80 }),
    description: text("description"),
    relatedDocumentType: varchar("related_document_type", { length: 80 }),
    relatedDocumentReference: varchar("related_document_reference", {
      length: 120,
    }),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("supplier_transactions_supplier_idx").on(table.supplierId),
    index("supplier_transactions_reference_idx").on(table.reference),
  ],
);

export const supplierInquiries = pgTable(
  "supplier_inquiries",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => catalogProducts.id),
    requestedProductName: varchar("requested_product_name", { length: 200 }),
    attachmentUrl: varchar("attachment_url", { length: 1000 }),
    attachmentName: varchar("attachment_name", { length: 255 }),
    attachmentMimeType: varchar("attachment_mime_type", { length: 100 }),
    status: supplierInquiryStatusEnum("status").default("sent").notNull(),
    requestedQuantity: integer("requested_quantity"),
    neededBy: timestamp("needed_by", { withTimezone: true }),
    message: text("message").notNull(),
    supplierResponse: text("supplier_response"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    requestedBy: uuid("requested_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("supplier_inquiries_reference_unique").on(table.reference),
    index("supplier_inquiries_supplier_idx").on(table.supplierId),
    index("supplier_inquiries_status_idx").on(table.status),
  ],
);

export const supplierContacts = pgTable(
  "supplier_contacts",
  {
    id: publicUuidColumn(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 80 }),
    jobTitle: varchar("job_title", { length: 160 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    status: supplierContactStatusEnum("status").default("active").notNull(),
    ...auditColumns,
  },
  (table) => [
    index("supplier_contacts_supplier_idx").on(table.supplierId),
    index("supplier_contacts_user_idx").on(table.userId),
    uniqueIndex("supplier_contacts_primary_unique")
      .on(table.supplierId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const suppliersRelations = relations(suppliers, ({ many, one }) => ({
  contacts: many(supplierContacts),
  inquiries: many(supplierInquiries),
  products: many(supplierProducts),
  transactions: many(supplierTransactions),
  creator: one(users, {
    fields: [suppliers.createdBy],
    references: [users.id],
  }),
}));

export const supplierProductsRelations = relations(
  supplierProducts,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierProducts.supplierId],
      references: [suppliers.id],
    }),
    product: one(catalogProducts, {
      fields: [supplierProducts.productId],
      references: [catalogProducts.id],
    }),
  }),
);

export const supplierTransactionsRelations = relations(
  supplierTransactions,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierTransactions.supplierId],
      references: [suppliers.id],
    }),
    creator: one(users, {
      fields: [supplierTransactions.createdBy],
      references: [users.id],
    }),
  }),
);

export const supplierInquiriesRelations = relations(
  supplierInquiries,
  ({ one }) => ({
    product: one(catalogProducts, {
      fields: [supplierInquiries.productId],
      references: [catalogProducts.id],
    }),
    supplier: one(suppliers, {
      fields: [supplierInquiries.supplierId],
      references: [suppliers.id],
    }),
  }),
);

export const supplierContactsRelations = relations(
  supplierContacts,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierContacts.supplierId],
      references: [suppliers.id],
    }),
    user: one(users, {
      fields: [supplierContacts.userId],
      references: [users.id],
    }),
  }),
);
