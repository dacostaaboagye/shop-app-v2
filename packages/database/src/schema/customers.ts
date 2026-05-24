import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";

export const customerTypeEnum = pgEnum("customer_type", [
  "individual",
  "business",
]);

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "inactive",
  "blocked",
]);

export const customerContactStatusEnum = pgEnum("customer_contact_status", [
  "active",
  "inactive",
]);

export const customerAddressTypeEnum = pgEnum("customer_address_type", [
  "billing",
  "shipping",
  "both",
]);

export const customerEventTypeEnum = pgEnum("customer_event_type", [
  "customer_created",
  "customer_updated",
  "contact_added",
  "address_added",
  "note_added",
  "portal_linked",
  "portal_unlinked",
]);

export const customers = pgTable(
  "customers",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull().unique(),
    slug: slugColumn().unique(),
    displayName: varchar("display_name", { length: 180 }).notNull(),
    legalName: varchar("legal_name", { length: 220 }),
    customerType: customerTypeEnum("customer_type")
      .default("business")
      .notNull(),
    status: customerStatusEnum("status").default("active").notNull(),
    taxNumber: varchar("tax_number", { length: 120 }),
    defaultCurrencyCode: varchar("default_currency_code", { length: 3 }),
    paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
    creditLimitAmount: numeric("credit_limit_amount", {
      precision: 12,
      scale: 2,
    }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("customers_reference_idx").on(table.reference),
    index("customers_status_idx").on(table.status),
    uniqueIndex("customers_display_name_unique").on(table.displayName),
  ],
);

export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    name: varchar("name", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 80 }),
    roleTitle: varchar("role_title", { length: 160 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    receivesInvoices: boolean("receives_invoices").default(false).notNull(),
    receivesDeliveryUpdates: boolean("receives_delivery_updates")
      .default(false)
      .notNull(),
    status: customerContactStatusEnum("status").default("active").notNull(),
    ...auditColumns,
  },
  (table) => [
    index("customer_contacts_customer_idx").on(table.customerId),
    index("customer_contacts_user_idx").on(table.userId),
    uniqueIndex("customer_contacts_primary_unique")
      .on(table.customerId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    type: customerAddressTypeEnum("type").notNull(),
    recipientName: varchar("recipient_name", { length: 180 }),
    recipientPhone: varchar("recipient_phone", { length: 80 }),
    addressLines: jsonb("address_lines").$type<string[]>().notNull(),
    city: varchar("city", { length: 120 }),
    region: varchar("region", { length: 120 }),
    countryCode: varchar("country_code", { length: 2 }),
    isDefaultBilling: boolean("is_default_billing").default(false).notNull(),
    isDefaultShipping: boolean("is_default_shipping").default(false).notNull(),
    status: customerStatusEnum("status").default("active").notNull(),
    ...auditColumns,
  },
  (table) => [
    index("customer_addresses_customer_idx").on(table.customerId),
    uniqueIndex("customer_addresses_default_billing_unique")
      .on(table.customerId)
      .where(sql`${table.isDefaultBilling} = true`),
    uniqueIndex("customer_addresses_default_shipping_unique")
      .on(table.customerId)
      .where(sql`${table.isDefaultShipping} = true`),
  ],
);

export const customerEvents = pgTable(
  "customer_events",
  {
    id: publicUuidColumn(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    eventType: customerEventTypeEnum("event_type").notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("customer_events_customer_idx").on(table.customerId),
    index("customer_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const customersRelations = relations(customers, ({ many, one }) => ({
  addresses: many(customerAddresses),
  contacts: many(customerContacts),
  events: many(customerEvents),
  creator: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
  }),
}));

export const customerContactsRelations = relations(
  customerContacts,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerContacts.customerId],
      references: [customers.id],
    }),
    user: one(users, {
      fields: [customerContacts.userId],
      references: [users.id],
    }),
  }),
);

export const customerAddressesRelations = relations(
  customerAddresses,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerAddresses.customerId],
      references: [customers.id],
    }),
  }),
);

export const customerEventsRelations = relations(customerEvents, ({ one }) => ({
  actor: one(users, {
    fields: [customerEvents.actorId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [customerEvents.customerId],
    references: [customers.id],
  }),
}));
