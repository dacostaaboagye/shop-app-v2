import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";

export const emailDeliveryStatusEnum = pgEnum("email_delivery_status", [
  "bounced",
  "complained",
  "console_fallback",
  "delayed",
  "delivered",
  "failed",
  "sent",
  "suppressed",
]);

export const emailDeliveryAttempts = pgTable(
  "email_delivery_attempts",
  {
    id: publicUuidColumn(),
    messageType: varchar("message_type", { length: 80 }).notNull(),
    recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 240 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 160 }),
    status: emailDeliveryStatusEnum("status").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("email_delivery_attempts_recipient_idx").on(table.recipientEmail),
    index("email_delivery_attempts_status_idx").on(table.status),
    index("email_delivery_attempts_type_idx").on(table.messageType),
  ],
);

export const emailDeliveryStatusEvents = pgTable(
  "email_delivery_status_events",
  {
    id: publicUuidColumn(),
    attemptId: uuid("attempt_id"),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 160 }).notNull(),
    providerEventType: varchar("provider_event_type", { length: 80 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 160 }),
    status: emailDeliveryStatusEnum("status").notNull(),
    statusReason: text("status_reason"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.attemptId],
      foreignColumns: [emailDeliveryAttempts.id],
      name: "email_delivery_status_events_attempt_fk",
    }).onDelete("set null"),
    index("email_delivery_status_events_attempt_idx").on(table.attemptId),
    index("email_delivery_status_events_message_idx").on(
      table.providerMessageId,
    ),
    index("email_delivery_status_events_status_idx").on(table.status),
    uniqueIndex("email_delivery_status_events_event_unique").on(
      table.providerEventId,
    ),
  ],
);
