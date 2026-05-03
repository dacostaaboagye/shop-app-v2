import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";

export const catalogChangeEntityTypeEnum = pgEnum(
  "catalog_change_entity_type",
  [
    "catalog_brand",
    "catalog_category",
    "catalog_product",
    "product_variant",
    "catalog_product_option",
    "catalog_product_option_value",
  ],
);

export const catalogChangeOperationEnum = pgEnum("catalog_change_operation", [
  "created",
  "updated",
  "archived",
  "restored",
  "deleted",
]);

export const catalogChangeLog = pgTable(
  "catalog_change_log",
  {
    id: publicUuidColumn(),
    entityType: catalogChangeEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    entityRef: varchar("entity_ref", { length: 120 }).notNull(),
    parentEntityType: catalogChangeEntityTypeEnum("parent_entity_type"),
    parentEntityId: uuid("parent_entity_id"),
    operation: catalogChangeOperationEnum("operation").notNull(),
    changedFields: jsonb("changed_fields")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("catalog_change_log_entity_idx").on(
      table.entityType,
      table.entityId,
      table.occurredAt.desc(),
    ),
    index("catalog_change_log_parent_idx")
      .on(table.parentEntityType, table.parentEntityId, table.occurredAt.desc())
      .where(sql`${table.parentEntityId} IS NOT NULL`),
    index("catalog_change_log_actor_idx").on(
      table.actorId,
      table.occurredAt.desc(),
    ),
    check(
      "catalog_change_log_create_has_after",
      sql`${table.operation} <> 'created' OR ${table.after} IS NOT NULL`,
    ),
    check(
      "catalog_change_log_delete_has_before",
      sql`${table.operation} <> 'deleted' OR ${table.before} IS NOT NULL`,
    ),
    check(
      "catalog_change_log_update_has_both",
      sql`${table.operation} NOT IN ('updated','archived','restored') OR (${table.before} IS NOT NULL AND ${table.after} IS NOT NULL)`,
    ),
  ],
);
