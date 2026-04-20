import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";
import { users } from "./identity.js";
import { locations } from "./locations.js";

export const platformEventAudienceKindEnum = pgEnum(
  "platform_event_audience_kind",
  ["user", "permission"],
);

export const platformEventDeliveryStatusEnum = pgEnum(
  "platform_event_delivery_status",
  ["pending", "processing", "delivered", "failed"],
);

export const userNotificationStatusEnum = pgEnum("user_notification_status", [
  "unread",
  "read",
]);

export const platformEvents = pgTable(
  "platform_events",
  {
    id: uuid("id").primaryKey(),
    type: varchar("type", { length: 120 }).notNull(),
    summary: text("summary").notNull(),
    resourceKind: varchar("resource_kind", { length: 80 }).notNull(),
    resourceReference: varchar("resource_reference", { length: 120 }).notNull(),
    actorUserSlug: varchar("actor_user_slug", { length: 120 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    deliveryStatus: platformEventDeliveryStatusEnum("delivery_status")
      .default("pending")
      .notNull(),
    deliveryAttempts: integer("delivery_attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("platform_events_type_idx").on(table.type),
    index("platform_events_occurred_at_idx").on(table.occurredAt),
    index("platform_events_delivery_idx").on(
      table.deliveryStatus,
      table.availableAt,
    ),
    index("platform_events_resource_idx").on(
      table.resourceKind,
      table.resourceReference,
    ),
    check(
      "platform_events_delivery_attempts_nonnegative",
      sql`${table.deliveryAttempts} >= 0`,
    ),
  ],
);

export const platformEventAudiences = pgTable(
  "platform_event_audiences",
  {
    id: publicUuidColumn(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => platformEvents.id, { onDelete: "cascade" }),
    audienceKind: platformEventAudienceKindEnum("audience_kind").notNull(),
    userId: uuid("user_id").references(() => users.id),
    permissionKey: varchar("permission_key", { length: 120 }),
    locationId: uuid("location_id").references(() => locations.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("platform_event_audiences_event_idx").on(table.eventId),
    index("platform_event_audiences_user_idx").on(table.userId),
    index("platform_event_audiences_permission_idx").on(
      table.permissionKey,
      table.locationId,
    ),
    check(
      "platform_event_audiences_shape_check",
      sql`(
        ${table.audienceKind} = 'user'
        and ${table.userId} is not null
        and ${table.permissionKey} is null
      ) or (
        ${table.audienceKind} = 'permission'
        and ${table.userId} is null
        and ${table.permissionKey} is not null
      )`,
    ),
  ],
);

export const userNotifications = pgTable(
  "user_notifications",
  {
    id: publicUuidColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => platformEvents.id, { onDelete: "cascade" }),
    status: userNotificationStatusEnum("status").default("unread").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_notifications_user_idx").on(table.userId, table.createdAt),
    index("user_notifications_status_idx").on(table.userId, table.status),
    uniqueIndex("user_notifications_user_event_unique").on(
      table.userId,
      table.eventId,
    ),
    check(
      "user_notifications_read_at_check",
      sql`(
        ${table.status} = 'unread'
        and ${table.readAt} is null
      ) or (
        ${table.status} = 'read'
        and ${table.readAt} is not null
      )`,
    ),
  ],
);
