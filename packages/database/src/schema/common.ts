import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const slugColumn = (name = "slug") =>
  varchar(name, { length: 120 }).notNull();
export const publicUuidColumn = (name = "id") =>
  uuid(name).defaultRandom().primaryKey();
