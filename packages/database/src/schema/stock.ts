import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const stockReservationStatusEnum = pgEnum("stock_reservation_status", [
  "active",
  "confirmed",
  "released",
  "expired",
  "cancelled",
]);

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: publicUuidColumn(),
    skuId: uuid("sku_id").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    onHandQuantity: integer("on_hand_quantity").default(0).notNull(),
    reservedQuantity: integer("reserved_quantity").default(0).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_balances_sku_location_unique").on(
      table.skuId,
      table.locationId,
    ),
    index("stock_balances_location_idx").on(table.locationId),
    check(
      "stock_balances_on_hand_nonnegative",
      sql`${table.onHandQuantity} >= 0`,
    ),
    check(
      "stock_balances_reserved_nonnegative",
      sql`${table.reservedQuantity} >= 0`,
    ),
    check(
      "stock_balances_reserved_lte_on_hand",
      sql`${table.reservedQuantity} <= ${table.onHandQuantity}`,
    ),
  ],
);

export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: publicUuidColumn(),
    skuId: uuid("sku_id").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    quantity: integer("quantity").notNull(),
    status: stockReservationStatusEnum("status").default("active").notNull(),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceKey: varchar("source_key", { length: 160 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_reservations_sku_location_status_idx").on(
      table.skuId,
      table.locationId,
      table.status,
    ),
    index("stock_reservations_source_idx").on(
      table.sourceType,
      table.sourceKey,
    ),
    index("stock_reservations_expires_at_idx").on(table.expiresAt),
    uniqueIndex("stock_reservations_active_source_unique")
      .on(table.skuId, table.locationId, table.sourceType, table.sourceKey)
      .where(sql`${table.status} = 'active'`),
    check("stock_reservations_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "stock_reservations_expiry_after_create",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} >= ${table.createdAt}`,
    ),
  ],
);
