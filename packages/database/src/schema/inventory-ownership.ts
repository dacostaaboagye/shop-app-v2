import {
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
    productId: uuid("product_id").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    workerId: uuid("worker_id").references(() => users.id),
    eventType: ownershipEventTypeEnum("event_type").notNull(),
    quantity: integer("quantity").notNull(),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    handoverChainId: uuid("handover_chain_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_ownership_events_current_owner_idx").on(
      table.productId,
      table.locationId,
      table.effectiveFrom,
    ),
    index("stock_ownership_events_handover_chain_idx").on(
      table.handoverChainId,
    ),
  ],
);
