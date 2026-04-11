import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn } from "./common.js";
import { users } from "./identity.js";

// One row per unique uploaded file — the canonical asset record.
// An asset can be assigned to multiple catalog entities (reuse without re-upload).
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: publicUuidColumn(),
    storageKey: varchar("storage_key", { length: 500 }).notNull().unique(),
    publicUrl: varchar("public_url", { length: 1000 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    mediaType: varchar("media_type", { length: 20 }).notNull().default("image"),
    fileSizeBytes: integer("file_size_bytes"),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [index("media_assets_type_idx").on(table.mediaType)],
);

// Links a media asset to a catalog entity (product, variant, category, brand).
// Alt text lives here so the same asset can have context-specific descriptions.
export const catalogMediaAssignments = pgTable(
  "catalog_media_assignments",
  {
    id: publicUuidColumn(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entitySlug: varchar("entity_slug", { length: 120 }).notNull(),
    altText: varchar("alt_text", { length: 300 }),
    position: smallint("position").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    assignedBy: uuid("assigned_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("catalog_media_assignments_entity_idx").on(
      table.entityType,
      table.entitySlug,
      table.position,
    ),
    uniqueIndex("catalog_media_assignments_primary_unique")
      .on(table.entityType, table.entitySlug)
      .where(sql`${table.isPrimary} = true`),
    uniqueIndex("catalog_media_assignments_asset_entity_unique").on(
      table.assetId,
      table.entityType,
      table.entitySlug,
    ),
  ],
);
