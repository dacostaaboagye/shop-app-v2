import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
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

export type GtnSkuSnapshot = {
  sku: string;
  productName: string;
  variantName: string;
};

export const goodsTransferNotes = pgTable(
  "goods_transfer_notes",
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

    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),

    skuSnapshot: jsonb("sku_snapshot").$type<GtnSkuSnapshot>().notNull(),
    quantity: integer("quantity").notNull(),

    // dispatched → received | cancelled
    status: varchar("status", { length: 20 }).notNull().default("dispatched"),

    dispatchedBy: uuid("dispatched_by")
      .notNull()
      .references(() => users.id),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull(),

    receivedBy: uuid("received_by").references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    receivedQuantity: integer("received_quantity"),
    receiptDiscrepancyReason: varchar("receipt_discrepancy_reason", {
      length: 32,
    }),
    receiptDiscrepancyNotes: text("receipt_discrepancy_notes"),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("gtn_reference_unique").on(table.reference),
    uniqueIndex("gtn_supply_request_unique").on(table.supplyRequestId),
    check("gtn_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "gtn_status_check",
      sql`${table.status} IN ('dispatched', 'received', 'cancelled')`,
    ),
    check(
      "gtn_received_qty_nonnegative",
      sql`${table.receivedQuantity} IS NULL OR ${table.receivedQuantity} >= 0`,
    ),
    check(
      "gtn_discrepancy_reason_check",
      sql`${table.receiptDiscrepancyReason} IS NULL OR ${table.receiptDiscrepancyReason} IN ('short_received', 'damaged_received', 'wrong_item', 'other')`,
    ),
    index("gtn_source_location_idx").on(table.sourceLocationId),
    index("gtn_destination_location_idx").on(table.destinationLocationId),
    index("gtn_status_idx").on(table.status),
    index("gtn_dispatched_at_idx").on(table.dispatchedAt),
  ],
);

export const goodsTransferNotesRelations = relations(
  goodsTransferNotes,
  ({ one }) => ({
    supplyRequest: one(stockSupplyRequests, {
      fields: [goodsTransferNotes.supplyRequestId],
      references: [stockSupplyRequests.id],
    }),
    sourceLocation: one(locations, {
      fields: [goodsTransferNotes.sourceLocationId],
      references: [locations.id],
      relationName: "gtn_source",
    }),
    destinationLocation: one(locations, {
      fields: [goodsTransferNotes.destinationLocationId],
      references: [locations.id],
      relationName: "gtn_destination",
    }),
    sku: one(productVariants, {
      fields: [goodsTransferNotes.skuId],
      references: [productVariants.id],
    }),
    dispatchedByUser: one(users, {
      fields: [goodsTransferNotes.dispatchedBy],
      references: [users.id],
      relationName: "gtn_dispatcher",
    }),
    receivedByUser: one(users, {
      fields: [goodsTransferNotes.receivedBy],
      references: [users.id],
      relationName: "gtn_receiver",
    }),
  }),
);
