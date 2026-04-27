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

export type SupplySkuSnapshot = {
  sku: string;
  productName: string;
  variantName: string;
};

export const stockSupplyRequests = pgTable(
  "stock_supply_requests",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull(),
    requestGroupReference: varchar("request_group_reference", {
      length: 25,
    }),

    // Who is requesting and where the goods should go (destination)
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),

    // Where goods should come from (source)
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id),

    // What is being requested
    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),
    skuSnapshot: jsonb("sku_snapshot").$type<SupplySkuSnapshot>().notNull(),
    requestedQuantity: integer("requested_quantity").notNull(),

    // Status lifecycle: pending → approved → dispatched → received
    //                         → rejected
    //                         → cancelled (before dispatch)
    status: varchar("status", { length: 20 }).notNull().default("pending"),

    // Requester notes
    notes: text("notes"),

    // Approval fields (set when approved or rejected)
    approvedQuantity: integer("approved_quantity"),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    // Dispatch fields (set when dispatched, stock deducted from source)
    dispatchedBy: uuid("dispatched_by").references(() => users.id),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),

    // Receipt fields (set when worker confirms receipt, stock added to destination)
    receivedAt: timestamp("received_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("supply_requests_reference_unique").on(table.reference),
    index("supply_requests_group_reference_idx").on(
      table.requestGroupReference,
    ),
    check("supply_requests_qty_positive", sql`${table.requestedQuantity} > 0`),
    check(
      "supply_requests_approved_qty_positive",
      sql`${table.approvedQuantity} IS NULL OR ${table.approvedQuantity} > 0`,
    ),
    check(
      "supply_requests_status_check",
      sql`${table.status} IN ('pending', 'approved', 'dispatched', 'received', 'rejected', 'cancelled')`,
    ),
    index("supply_requests_requester_idx").on(table.requesterId),
    index("supply_requests_location_idx").on(table.locationId),
    index("supply_requests_source_location_idx").on(table.sourceLocationId),
    index("supply_requests_status_idx").on(table.status),
    index("supply_requests_created_at_idx").on(table.createdAt),
  ],
);

export const stockSupplyRequestsRelations = relations(
  stockSupplyRequests,
  ({ one }) => ({
    requester: one(users, {
      fields: [stockSupplyRequests.requesterId],
      references: [users.id],
      relationName: "supply_requester",
    }),
    location: one(locations, {
      fields: [stockSupplyRequests.locationId],
      references: [locations.id],
      relationName: "supply_destination",
    }),
    sourceLocation: one(locations, {
      fields: [stockSupplyRequests.sourceLocationId],
      references: [locations.id],
      relationName: "supply_source",
    }),
    sku: one(productVariants, {
      fields: [stockSupplyRequests.skuId],
      references: [productVariants.id],
    }),
    resolvedByUser: one(users, {
      fields: [stockSupplyRequests.resolvedBy],
      references: [users.id],
      relationName: "supply_resolver",
    }),
    dispatchedByUser: one(users, {
      fields: [stockSupplyRequests.dispatchedBy],
      references: [users.id],
      relationName: "supply_dispatcher",
    }),
  }),
);
