import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const stockBalanceInitializations = pgTable(
  "stock_balance_initializations",
  {
    id: publicUuidColumn(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => productVariants.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    openingQuantity: integer("opening_quantity").notNull(),
    sourceType: varchar("source_type", { length: 64 }).notNull(),
    sourceKey: varchar("source_key", { length: 160 }).notNull(),
    note: varchar("note", { length: 500 }),
    initializedBy: uuid("initialized_by").references(() => users.id),
    initializedAt: timestamp("initialized_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_balance_initializations_sku_location_unique").on(
      table.skuId,
      table.locationId,
    ),
    index("stock_balance_initializations_location_idx").on(table.locationId),
    index("stock_balance_initializations_initialized_at_idx").on(
      table.initializedAt,
    ),
    check(
      "stock_balance_initializations_opening_quantity_nonnegative",
      sql`${table.openingQuantity} >= 0`,
    ),
  ],
);

export const stockBalanceInitializationsRelations = relations(
  stockBalanceInitializations,
  ({ one }) => ({
    location: one(locations, {
      fields: [stockBalanceInitializations.locationId],
      references: [locations.id],
    }),
    variant: one(productVariants, {
      fields: [stockBalanceInitializations.skuId],
      references: [productVariants.id],
    }),
  }),
);
