import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const permissions = pgTable(
  "permissions",
  {
    id: publicUuidColumn(),
    key: varchar("key", { length: 120 }).notNull().unique(),
    description: text("description").notNull(),
  },
  (table) => [index("permissions_key_idx").on(table.key)],
);

export const roles = pgTable(
  "roles",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("roles_slug_idx").on(table.slug)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("role_permissions_role_idx").on(table.roleId),
    index("role_permissions_permission_idx").on(table.permissionId),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    locationId: uuid("location_id").references(() => locations.id),
    assignedBy: uuid("assigned_by").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    revokedReason: text("revoked_reason"),
  },
  (table) => [
    index("user_roles_user_idx").on(table.userId),
    index("user_roles_role_idx").on(table.roleId),
    index("user_roles_location_idx").on(table.locationId),
  ],
);

export const userPermissionOverrides = pgTable(
  "user_permission_overrides",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id),
    locationId: uuid("location_id").references(() => locations.id),
    effect: varchar("effect", { length: 16 }).notNull(),
    reason: text("reason").notNull(),
    setBy: uuid("set_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    index("user_permission_overrides_user_idx").on(table.userId),
    index("user_permission_overrides_permission_idx").on(table.permissionId),
  ],
);

export const permissionAuditLog = pgTable(
  "permission_audit_log",
  {
    id: publicUuidColumn(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 64 }).notNull(),
    permissionKey: varchar("permission_key", { length: 120 }),
    roleSlug: varchar("role_slug", { length: 120 }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("permission_audit_log_target_idx").on(table.targetUserId)],
);
