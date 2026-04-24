import { relations } from "drizzle-orm";
import {
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
import { productVariants } from "./catalog.js";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";
import { suppliers } from "./suppliers.js";

export const supplierProcurementStatusEnum = pgEnum(
  "supplier_procurement_status",
  [
    "draft",
    "submitted",
    "approved",
    "ordered",
    "partially_received",
    "received",
    "cancelled",
    "closed",
  ],
);

export const supplierProcurementOrders = pgTable(
  "supplier_procurement_orders",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 25 }).notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    destinationLocationId: uuid("destination_location_id").references(
      () => locations.id,
    ),
    status: supplierProcurementStatusEnum("status").default("draft").notNull(),
    requestedBy: uuid("requested_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    expectedAt: timestamp("expected_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("supplier_procurement_orders_reference_unique").on(
      table.reference,
    ),
    index("supplier_procurement_orders_supplier_idx").on(table.supplierId),
    index("supplier_procurement_orders_status_idx").on(table.status),
  ],
);

export const supplierProcurementOrderLines = pgTable(
  "supplier_procurement_order_lines",
  {
    id: publicUuidColumn(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => supplierProcurementOrders.id, { onDelete: "cascade" }),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),
    requestedQuantity: integer("requested_quantity").notNull(),
    approvedQuantity: integer("approved_quantity"),
    receivedQuantity: integer("received_quantity").default(0).notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    index("supplier_procurement_order_lines_order_idx").on(table.orderId),
    uniqueIndex("supplier_procurement_order_lines_order_sku_unique").on(
      table.orderId,
      table.skuId,
    ),
  ],
);

export const supplierProcurementOrdersRelations = relations(
  supplierProcurementOrders,
  ({ many, one }) => ({
    destinationLocation: one(locations, {
      fields: [supplierProcurementOrders.destinationLocationId],
      references: [locations.id],
    }),
    lines: many(supplierProcurementOrderLines),
    supplier: one(suppliers, {
      fields: [supplierProcurementOrders.supplierId],
      references: [suppliers.id],
    }),
  }),
);

export const supplierProcurementOrderLinesRelations = relations(
  supplierProcurementOrderLines,
  ({ one }) => ({
    order: one(supplierProcurementOrders, {
      fields: [supplierProcurementOrderLines.orderId],
      references: [supplierProcurementOrders.id],
    }),
    sku: one(productVariants, {
      fields: [supplierProcurementOrderLines.skuId],
      references: [productVariants.id],
    }),
  }),
);
