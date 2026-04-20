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
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const invoiceTypeEnum = pgEnum("invoice_type", [
  "pos",
  "portal",
  "ecommerce",
  "manual",
  "credit_note",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "confirmed",
  "voided",
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
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("invoices_reference_unique").on(table.reference),
    index("invoices_location_status_idx").on(table.locationId, table.status),
    index("invoices_worker_idx").on(table.attributedWorkerId),
    index("invoices_type_location_idx").on(table.type, table.locationId),
    index("invoices_created_at_idx").on(table.createdAt),
    check("invoices_subtotal_nonnegative", sql`${table.subtotalAmount} >= 0`),
    check("invoices_tax_nonnegative", sql`${table.taxAmount} >= 0`),
    check("invoices_total_nonnegative", sql`${table.totalAmount} >= 0`),
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
  lines: many(invoiceLineItems),
  parentInvoice: one(invoices, {
    fields: [invoices.parentInvoiceId],
    references: [invoices.id],
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
