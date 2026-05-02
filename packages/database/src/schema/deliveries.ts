import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "draft",
  "assigned",
  "in_transit",
  "completed",
  "cancelled",
]);

export const deliverySourceTypeEnum = pgEnum("delivery_source_type", [
  "pos_sale",
  "online_order",
  "transfer",
]);

export const deliveries = pgTable(
  "deliveries",
  {
    id: publicUuidColumn(),
    sourceType: deliverySourceTypeEnum("source_type").notNull(),
    sourceReference: varchar("source_reference", { length: 64 }).notNull(),
    originLocationId: uuid("origin_location_id")
      .notNull()
      .references(() => locations.id),
    destinationLocationId: uuid("destination_location_id").references(
      () => locations.id,
    ),
    destinationKind: varchar("destination_kind", { length: 16 }).notNull(),
    destinationSnapshot: jsonb("destination_snapshot"),
    status: deliveryStatusEnum("status").default("draft").notNull(),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    assignedBy: uuid("assigned_by").references(() => users.id),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    dispatchedBy: uuid("dispatched_by").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancellationReason: varchar("cancellation_reason", { length: 240 }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("deliveries_source_unique").on(
      table.sourceType,
      table.sourceReference,
    ),
    index("deliveries_origin_location_idx").on(table.originLocationId),
    index("deliveries_destination_location_idx").on(
      table.destinationLocationId,
    ),
    index("deliveries_status_idx").on(table.status),
    index("deliveries_assigned_user_idx").on(table.assignedUserId),
    check(
      "deliveries_destination_kind_consistent",
      sql`(
        (${table.destinationKind} = 'location' AND ${table.destinationLocationId} IS NOT NULL)
        OR
        (${table.destinationKind} = 'external' AND ${table.destinationLocationId} IS NULL AND ${table.destinationSnapshot} IS NOT NULL)
      )`,
    ),
    check(
      "deliveries_origin_destination_distinct",
      sql`${table.destinationLocationId} IS NULL OR ${table.destinationLocationId} <> ${table.originLocationId}`,
    ),
    check(
      "deliveries_cancellation_reason_consistent",
      sql`(${table.status} = 'cancelled') = (${table.cancellationReason} IS NOT NULL)`,
    ),
  ],
);

export const deliveriesRelations = relations(deliveries, ({ many, one }) => ({
  originLocation: one(locations, {
    fields: [deliveries.originLocationId],
    references: [locations.id],
  }),
  destinationLocation: one(locations, {
    fields: [deliveries.destinationLocationId],
    references: [locations.id],
  }),
  items: many(deliveryItems),
}));

export const deliveryItems = pgTable(
  "delivery_items",
  {
    id: publicUuidColumn(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id),
    skuId: uuid("sku_id").notNull(),
    quantity: integer("quantity").notNull(),
    itemReference: varchar("item_reference", { length: 40 }).notNull(),
    ...auditColumns,
  },
  (table) => [
    index("delivery_items_delivery_idx").on(table.deliveryId),
    uniqueIndex("delivery_items_reference_unique").on(table.itemReference),
    check("delivery_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const deliveryItemsRelations = relations(deliveryItems, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryItems.deliveryId],
    references: [deliveries.id],
  }),
}));
