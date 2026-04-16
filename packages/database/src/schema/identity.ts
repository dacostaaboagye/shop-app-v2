import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { locations } from "./locations.js";
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";
import { userPermissionOverrides, userRoles } from "./access-control.js";

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deactivated",
]);
export const authEventTypeEnum = pgEnum("auth_event_type", [
  "login",
  "logout",
  "failed_attempt",
  "lockout",
  "token_refresh",
]);

export const users = pgTable(
  "users",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    preferredPortal: varchar("preferred_portal", { length: 64 }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    requiresPasswordChange: boolean("requires_password_change")
      .default(false)
      .notNull(),
    ...auditColumns,
  },
  (table) => [index("users_status_idx").on(table.status)],
);

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  authEvents: many(authEvents),
  userRoles: many(userRoles, { relationName: "user_roles_user" }),
  assignedUserRoles: many(userRoles, { relationName: "user_roles_assigned_by" }),
  revokedUserRoles: many(userRoles, { relationName: "user_roles_revoked_by" }),
  permissionOverrides: many(userPermissionOverrides, { 
    relationName: "user_overrides_user" 
  }),
  setPermissionOverrides: many(userPermissionOverrides, { 
    relationName: "user_overrides_set_by" 
  }),
  removedPermissionOverrides: many(userPermissionOverrides, { 
    relationName: "user_overrides_removed_by" 
  }),
}));

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("refresh_tokens_user_idx").on(table.userId),
    uniqueIndex("refresh_tokens_token_hash_idx").on(table.tokenHash),
  ],
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [index("password_reset_tokens_user_idx").on(table.userId)],
);

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

export const authEvents = pgTable(
  "auth_events",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id").references(() => users.id),
    eventType: authEventTypeEnum("event_type").notNull(),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_events_user_idx").on(table.userId)],
);

export const authEventsRelations = relations(authEvents, ({ one }) => ({
  user: one(users, {
    fields: [authEvents.userId],
    references: [users.id],
  }),
}));

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: publicUuidColumn(),
    email: varchar("email", { length: 320 }).notNull(),
    ipAddress: varchar("ip_address", { length: 80 }),
    succeeded: boolean("succeeded").default(false).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockoutWindowMinutes: integer("lockout_window_minutes")
      .default(15)
      .notNull(),
  },
  (table) => [index("login_attempts_email_idx").on(table.email)],
);
