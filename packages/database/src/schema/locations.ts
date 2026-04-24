import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";

export const locationTypeEnum = pgEnum("location_type", ["store", "warehouse"]);
export const locationStatusEnum = pgEnum("location_status", [
  "active",
  "inactive",
]);

export const locations = pgTable(
  "locations",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    type: locationTypeEnum("type").notNull(),
    address: jsonb("address"),
    status: locationStatusEnum("status").default("active").notNull(),
    isFulfilmentEnabled: boolean("is_fulfilment_enabled")
      .default(false)
      .notNull(),
    managerId: uuid("manager_id").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("locations_type_idx").on(table.type),
    index("locations_status_idx").on(table.status),
  ],
);

export const locationZones = pgTable(
  "location_zones",
  {
    id: publicUuidColumn(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    slug: slugColumn().notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("location_zones_location_idx").on(table.locationId)],
);
