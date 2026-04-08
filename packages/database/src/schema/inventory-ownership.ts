import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const ownershipEventTypeEnum = pgEnum("ownership_event_type", [
  "assigned",
  "reassigned",
  "handover_out",
  "handover_in",
  "reverted",
  "cancelled",
]);

export const stockOwnershipEvents = pgTable(
  "stock_ownership_events",
  {
    id: publicUuidColumn(),
    skuId: uuid("sku_id").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => users.id),
    eventType: ownershipEventTypeEnum("event_type").notNull(),
    quantity: integer("quantity").notNull(),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    handoverChainId: uuid("handover_chain_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_ownership_resolution").on(
      table.skuId,
      table.locationId,
      table.effectiveFrom.desc(),
    ),
    index("idx_ownership_chain")
      .on(table.handoverChainId)
      .where(sql`${table.handoverChainId} IS NOT NULL`),
    index("idx_ownership_worker").on(
      table.workerId,
      table.effectiveFrom.desc(),
    ),
    check(
      "stock_ownership_events_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
  ],
);
