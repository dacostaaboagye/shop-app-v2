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
import { invoices, type SkuSnapshot } from "./sales.js";

export const manualInvoiceRequestStatusEnum = pgEnum(
  "manual_invoice_request_status",
  ["pending", "approved", "rejected"],
);

export const manualInvoiceRequestEventActionEnum = pgEnum(
  "manual_invoice_request_event_action",
  ["submitted", "approved", "rejected"],
);

export const manualInvoiceRequests = pgTable(
  "manual_invoice_requests",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    status: manualInvoiceRequestStatusEnum("status")
      .default("pending")
      .notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerEmail: varchar("customer_email", { length: 160 }),
    customerPhone: varchar("customer_phone", { length: 80 }),
    customerTaxNumber: varchar("customer_tax_number", { length: 120 }),
    customerBillingAddressLines: jsonb("customer_billing_address_lines").$type<
      string[]
    >(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    currencyScale: integer("currency_scale").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    subtotalAmount: numeric("subtotal_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    supportingNote: text("supporting_note"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedInvoiceId: uuid("approved_invoice_id").references(
      () => invoices.id,
    ),
    rejectedBy: uuid("rejected_by").references(() => users.id),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("manual_invoice_requests_reference_unique").on(table.reference),
    uniqueIndex("manual_invoice_requests_approved_invoice_unique").on(
      table.approvedInvoiceId,
    ),
    index("manual_invoice_requests_location_status_idx").on(
      table.locationId,
      table.status,
    ),
    index("manual_invoice_requests_requested_by_idx").on(table.requestedBy),
    index("manual_invoice_requests_created_at_idx").on(table.createdAt),
    check(
      "manual_invoice_requests_subtotal_nonnegative",
      sql`${table.subtotalAmount} >= 0`,
    ),
    check(
      "manual_invoice_requests_tax_nonnegative",
      sql`${table.taxAmount} >= 0`,
    ),
    check(
      "manual_invoice_requests_total_nonnegative",
      sql`${table.totalAmount} >= 0`,
    ),
    check(
      "manual_invoice_requests_pending_state_clean",
      sql`${table.status} <> 'pending' or (${table.approvedBy} is null and ${table.approvedAt} is null and ${table.approvedInvoiceId} is null and ${table.rejectedBy} is null and ${table.rejectedAt} is null and ${table.rejectionReason} is null)`,
    ),
    check(
      "manual_invoice_requests_approved_state_complete",
      sql`${table.status} <> 'approved' or (${table.approvedBy} is not null and ${table.approvedAt} is not null and ${table.approvedInvoiceId} is not null)`,
    ),
    check(
      "manual_invoice_requests_rejected_state_complete",
      sql`${table.status} <> 'rejected' or (${table.rejectedBy} is not null and ${table.rejectedAt} is not null and ${table.rejectionReason} is not null)`,
    ),
  ],
);

export const manualInvoiceRequestLines = pgTable(
  "manual_invoice_request_lines",
  {
    id: publicUuidColumn(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => manualInvoiceRequests.id),
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
    ...auditColumns,
  },
  (table) => [
    index("manual_invoice_request_lines_request_idx").on(table.requestId),
    index("manual_invoice_request_lines_sku_idx").on(table.skuId),
    check(
      "manual_invoice_request_lines_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
    check(
      "manual_invoice_request_lines_unit_price_nonnegative",
      sql`${table.unitPrice} >= 0`,
    ),
  ],
);

export const manualInvoiceRequestEvents = pgTable(
  "manual_invoice_request_events",
  {
    id: publicUuidColumn(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => manualInvoiceRequests.id),
    action: manualInvoiceRequestEventActionEnum("action").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("manual_invoice_request_events_request_idx").on(table.requestId),
    index("manual_invoice_request_events_actor_idx").on(table.actorId),
  ],
);

export const manualInvoiceRequestsRelations = relations(
  manualInvoiceRequests,
  ({ one, many }) => ({
    approvedByUser: one(users, {
      fields: [manualInvoiceRequests.approvedBy],
      references: [users.id],
      relationName: "manual_invoice_requests_approved_by",
    }),
    approvedInvoice: one(invoices, {
      fields: [manualInvoiceRequests.approvedInvoiceId],
      references: [invoices.id],
    }),
    events: many(manualInvoiceRequestEvents),
    lines: many(manualInvoiceRequestLines),
    location: one(locations, {
      fields: [manualInvoiceRequests.locationId],
      references: [locations.id],
    }),
    rejectedByUser: one(users, {
      fields: [manualInvoiceRequests.rejectedBy],
      references: [users.id],
      relationName: "manual_invoice_requests_rejected_by",
    }),
    requester: one(users, {
      fields: [manualInvoiceRequests.requestedBy],
      references: [users.id],
      relationName: "manual_invoice_requests_requested_by",
    }),
  }),
);

export const manualInvoiceRequestLinesRelations = relations(
  manualInvoiceRequestLines,
  ({ one }) => ({
    request: one(manualInvoiceRequests, {
      fields: [manualInvoiceRequestLines.requestId],
      references: [manualInvoiceRequests.id],
    }),
    variant: one(productVariants, {
      fields: [manualInvoiceRequestLines.skuId],
      references: [productVariants.id],
    }),
  }),
);

export const manualInvoiceRequestEventsRelations = relations(
  manualInvoiceRequestEvents,
  ({ one }) => ({
    actor: one(users, {
      fields: [manualInvoiceRequestEvents.actorId],
      references: [users.id],
    }),
    request: one(manualInvoiceRequests, {
      fields: [manualInvoiceRequestEvents.requestId],
      references: [manualInvoiceRequests.id],
    }),
  }),
);
