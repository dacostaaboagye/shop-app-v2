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

export const deliveries = pgTable(
  "deliveries",
  {
    id: publicUuidColumn(),
    originLocationId: uuid("origin_location_id")
      .notNull()
      .references(() => locations.id),
    destinationLocationId: uuid("destination_location_id").references(
      () => locations.id,
    ),
    destinationSnapshot: jsonb("destination_snapshot"),
    status: deliveryStatusEnum("status").default("draft").notNull(),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("deliveries_origin_location_idx").on(table.originLocationId),
    index("deliveries_destination_location_idx").on(
      table.destinationLocationId,
    ),
    index("deliveries_status_idx").on(table.status),
    index("deliveries_assigned_user_idx").on(table.assignedUserId),
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
    itemReference: varchar("item_reference", { length: 40 }),
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
