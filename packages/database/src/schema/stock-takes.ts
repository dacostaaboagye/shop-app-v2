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
import { productVariants } from "./catalog.js";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const stockTakeModeEnum = pgEnum("stock_take_mode", [
  "blind",
  "assisted",
]);

export const stockTakeStatusEnum = pgEnum("stock_take_status", [
  "generated",
  "counted",
  "reviewed",
  "applied",
  "cancelled",
]);

export const stockTakeLineStatusEnum = pgEnum("stock_take_line_status", [
  "catalog_sku",
  "manual_blank",
  "counted",
  "skipped",
]);

export const stockTakeSessions = pgTable(
  "stock_take_sessions",
  {
    id: publicUuidColumn(),
    reference: varchar("reference", { length: 40 }).notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    status: stockTakeStatusEnum("status").default("generated").notNull(),
    mode: stockTakeModeEnum("mode").default("blind").notNull(),
    scope: jsonb("scope_json")
      .$type<{
        brandSlug?: string;
        categorySlug?: string;
        q?: string;
      }>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    sourceFileName: varchar("source_file_name", { length: 180 }),
    generatedBy: uuid("generated_by").references(() => users.id),
    generatedBySlug: varchar("generated_by_slug", { length: 120 }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    appliedBy: uuid("applied_by").references(() => users.id),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("stock_take_sessions_reference_unique").on(table.reference),
    index("stock_take_sessions_location_status_generated_idx").on(
      table.locationId,
      table.status,
      table.generatedAt,
    ),
  ],
);

export const stockTakeLines = pgTable(
  "stock_take_lines",
  {
    id: publicUuidColumn(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => stockTakeSessions.id),
    lineNumber: integer("line_number").notNull(),
    skuId: uuid("sku_id").references(() => productVariants.id),
    skuSnapshot: varchar("sku_snapshot", { length: 80 }).notNull(),
    productNameSnapshot: varchar("product_name_snapshot", {
      length: 200,
    }).notNull(),
    productSlugSnapshot: varchar("product_slug_snapshot", { length: 120 }),
    variantNameSnapshot: varchar("variant_name_snapshot", {
      length: 160,
    }).notNull(),
    variantSlugSnapshot: varchar("variant_slug_snapshot", { length: 120 }),
    barcodeSnapshot: varchar("barcode_snapshot", { length: 80 }),
    unitOfMeasureSnapshot: varchar("unit_of_measure_snapshot", {
      length: 40,
    }).notNull(),
    expectedOnHandSnapshot: integer("expected_on_hand_snapshot")
      .default(0)
      .notNull(),
    expectedReservedSnapshot: integer("expected_reserved_snapshot")
      .default(0)
      .notNull(),
    expectedAvailableSnapshot: integer("expected_available_snapshot")
      .default(0)
      .notNull(),
    countedQuantity: integer("counted_quantity"),
    note: varchar("note", { length: 500 }),
    appliedDelta: integer("applied_delta"),
    rowStatus: stockTakeLineStatusEnum("row_status")
      .default("catalog_sku")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_take_lines_session_line_unique").on(
      table.sessionId,
      table.lineNumber,
    ),
    uniqueIndex("stock_take_lines_session_sku_unique")
      .on(table.sessionId, table.skuId)
      .where(sql`${table.skuId} IS NOT NULL`),
    index("stock_take_lines_session_idx").on(table.sessionId),
    check(
      "stock_take_lines_line_number_positive",
      sql`${table.lineNumber} > 0`,
    ),
    check(
      "stock_take_lines_counted_quantity_nonnegative",
      sql`${table.countedQuantity} IS NULL OR ${table.countedQuantity} >= 0`,
    ),
  ],
);

export const stockTakeSessionsRelations = relations(
  stockTakeSessions,
  ({ many, one }) => ({
    generatedByUser: one(users, {
      fields: [stockTakeSessions.generatedBy],
      references: [users.id],
    }),
    lines: many(stockTakeLines),
    location: one(locations, {
      fields: [stockTakeSessions.locationId],
      references: [locations.id],
    }),
  }),
);

export const stockTakeLinesRelations = relations(stockTakeLines, ({ one }) => ({
  session: one(stockTakeSessions, {
    fields: [stockTakeLines.sessionId],
    references: [stockTakeSessions.id],
  }),
  variant: one(productVariants, {
    fields: [stockTakeLines.skuId],
    references: [productVariants.id],
  }),
}));
