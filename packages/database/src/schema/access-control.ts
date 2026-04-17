import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const permissionOverrideEffectEnum = pgEnum(
  "permission_override_effect",
  ["allow", "deny"],
);

export const permissionAuditActionEnum = pgEnum("permission_audit_action", [
  "role_assigned",
  "role_revoked",
  "override_set",
  "override_removed",
]);

export const permissions = pgTable(
  "permissions",
  {
    id: publicUuidColumn(),
    key: varchar("key", { length: 120 }).notNull().unique(),
    description: text("description").notNull(),
  },
  (table) => [index("permissions_key_idx").on(table.key)],
);

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  overrides: many(userPermissionOverrides),
}));

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

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

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
    uniqueIndex("role_permissions_role_permission_idx").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
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

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: "user_roles_user",
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  location: one(locations, {
    fields: [userRoles.locationId],
    references: [locations.id],
  }),
  assignedBy: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: "user_roles_assigned_by",
  }),
  revokedBy: one(users, {
    fields: [userRoles.revokedBy],
    references: [users.id],
    relationName: "user_roles_revoked_by",
  }),
}));

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
    effect: permissionOverrideEffectEnum("effect").notNull(),
    reason: text("reason").notNull(),
    setBy: uuid("set_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    removedBy: uuid("removed_by").references(() => users.id),
    removedReason: text("removed_reason"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (table) => [
    index("user_permission_overrides_user_idx").on(table.userId),
    index("user_permission_overrides_permission_idx").on(table.permissionId),
    index("user_permission_overrides_location_idx").on(table.locationId),
  ],
);

export const userPermissionOverridesRelations = relations(
  userPermissionOverrides,
  ({ one }) => ({
    user: one(users, {
      fields: [userPermissionOverrides.userId],
      references: [users.id],
      relationName: "user_overrides_user",
    }),
    permission: one(permissions, {
      fields: [userPermissionOverrides.permissionId],
      references: [permissions.id],
    }),
    location: one(locations, {
      fields: [userPermissionOverrides.locationId],
      references: [locations.id],
    }),
    setBy: one(users, {
      fields: [userPermissionOverrides.setBy],
      references: [users.id],
      relationName: "user_overrides_set_by",
    }),
    removedBy: one(users, {
      fields: [userPermissionOverrides.removedBy],
      references: [users.id],
      relationName: "user_overrides_removed_by",
    }),
  }),
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
    action: permissionAuditActionEnum("action").notNull(),
    locationId: uuid("location_id").references(() => locations.id),
    permissionKey: varchar("permission_key", { length: 120 }),
    roleSlug: varchar("role_slug", { length: 120 }),
    overrideEffect: permissionOverrideEffectEnum("override_effect"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("permission_audit_log_actor_idx").on(table.actorId),
    index("permission_audit_log_target_idx").on(table.targetUserId),
    index("permission_audit_log_location_idx").on(table.locationId),
  ],
);
