import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";

export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: publicUuidColumn(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityUuid: uuid("entity_uuid").notNull(),
    oldSlug: varchar("old_slug", { length: 120 }).notNull(),
    newSlug: varchar("new_slug", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("slug_redirects_old_slug_idx").on(table.entityType, table.oldSlug),
    index("slug_redirects_new_slug_idx").on(table.entityType, table.newSlug),
  ],
);

export const sequenceCounters = pgTable(
  "sequence_counters",
  {
    id: publicUuidColumn(),
    sequenceKey: varchar("sequence_key", { length: 80 }).notNull().unique(),
    currentValue: integer("current_value").default(0).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("sequence_counters_key_idx").on(table.sequenceKey)],
);
