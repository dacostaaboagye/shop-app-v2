import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";

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
    requiresPasswordChange: boolean("requires_password_change")
      .default(false)
      .notNull(),
    ...auditColumns,
  },
  (table) => [index("users_status_idx").on(table.status)],
);

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
  (table) => [index("refresh_tokens_user_idx").on(table.userId)],
);

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
