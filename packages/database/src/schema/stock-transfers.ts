import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";
import { stockSupplyRequests } from "./stock-supply.js";

export const stockTransferStatusEnum = pgEnum("stock_transfer_status", [
  "requested",
  "approved",
  "in_transit",
  "received",
  "rejected",
  "cancelled",
]);

export const stockTransferEventTypeEnum = pgEnum("stock_transfer_event_type", [
  "requested",
  "approved",
  "dispatched",
  "received",
  "rejected",
  "cancelled",
]);

export type StockTransferSkuSnapshot = {
  sku: string;
  productName: string;
  variantName: string;
};

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull(),
    supplyRequestId: uuid("supply_request_id")
      .notNull()
      .references(() => stockSupplyRequests.id),
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id),
    destinationLocationId: uuid("destination_location_id")
      .notNull()
      .references(() => locations.id),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),
    skuSnapshot: jsonb("sku_snapshot")
      .$type<StockTransferSkuSnapshot>()
      .notNull(),
    requestedQuantity: integer("requested_quantity").notNull(),
    approvedQuantity: integer("approved_quantity"),
    status: stockTransferStatusEnum("status").notNull().default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastEventAt: timestamp("last_event_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_transfers_reference_unique").on(table.reference),
    uniqueIndex("stock_transfers_supply_request_unique").on(
      table.supplyRequestId,
    ),
    index("stock_transfers_status_idx").on(table.status),
    index("stock_transfers_source_location_idx").on(table.sourceLocationId),
    index("stock_transfers_destination_location_idx").on(
      table.destinationLocationId,
    ),
  ],
);

export const stockTransferEvents = pgTable(
  "stock_transfer_events",
  {
    id: publicUuidColumn(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id),
    supplyRequestId: uuid("supply_request_id")
      .notNull()
      .references(() => stockSupplyRequests.id),
    eventType: stockTransferEventTypeEnum("event_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    summary: text("summary").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_transfer_events_transfer_idx").on(
      table.transferId,
      table.occurredAt,
    ),
    index("stock_transfer_events_type_idx").on(table.eventType),
    index("stock_transfer_events_supply_request_idx").on(table.supplyRequestId),
  ],
);

export const stockTransfersRelations = relations(
  stockTransfers,
  ({ one, many }) => ({
    destinationLocation: one(locations, {
      fields: [stockTransfers.destinationLocationId],
      references: [locations.id],
      relationName: "stock_transfer_destination",
    }),
    events: many(stockTransferEvents),
    requestedByUser: one(users, {
      fields: [stockTransfers.requestedBy],
      references: [users.id],
      relationName: "stock_transfer_requested_by",
    }),
    sourceLocation: one(locations, {
      fields: [stockTransfers.sourceLocationId],
      references: [locations.id],
      relationName: "stock_transfer_source",
    }),
    supplyRequest: one(stockSupplyRequests, {
      fields: [stockTransfers.supplyRequestId],
      references: [stockSupplyRequests.id],
    }),
  }),
);

export const stockTransferEventsRelations = relations(
  stockTransferEvents,
  ({ one }) => ({
    actorUser: one(users, {
      fields: [stockTransferEvents.actorUserId],
      references: [users.id],
      relationName: "stock_transfer_event_actor",
    }),
    supplyRequest: one(stockSupplyRequests, {
      fields: [stockTransferEvents.supplyRequestId],
      references: [stockSupplyRequests.id],
    }),
    transfer: one(stockTransfers, {
      fields: [stockTransferEvents.transferId],
      references: [stockTransfers.id],
    }),
  }),
);
