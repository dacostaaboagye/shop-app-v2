import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { publicUuidColumn } from "./common.js";
import { emailDeliveryAttempts, emailDeliveryStatusEnum } from "./email-delivery.js";
import { users } from "./identity.js";
import { supplierContacts } from "./suppliers.js";

export const supplierPortalInvites = pgTable(
  "supplier_portal_invites",
  {
    id: publicUuidColumn(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => supplierContacts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by").references(() => users.id),
    recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    deliveryStatus: emailDeliveryStatusEnum("delivery_status").notNull(),
    deliveryReason: varchar("delivery_reason", { length: 500 }),
    emailDeliveryAttemptId: uuid("email_delivery_attempt_id").references(
      () => emailDeliveryAttempts.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    index("supplier_portal_invites_contact_idx").on(table.contactId),
    index("supplier_portal_invites_user_idx").on(table.userId),
    index("supplier_portal_invites_created_idx").on(table.createdAt),
    index("supplier_portal_invites_delivery_idx").on(table.deliveryStatus),
  ],
);

export const supplierPortalInvitesRelations = relations(
  supplierPortalInvites,
  ({ one }) => ({
    contact: one(supplierContacts, {
      fields: [supplierPortalInvites.contactId],
      references: [supplierContacts.id],
    }),
    user: one(users, {
      fields: [supplierPortalInvites.userId],
      references: [users.id],
    }),
    invitedByUser: one(users, {
      fields: [supplierPortalInvites.invitedBy],
      references: [users.id],
      relationName: "supplier_portal_invites_invited_by",
    }),
    emailDeliveryAttempt: one(emailDeliveryAttempts, {
      fields: [supplierPortalInvites.emailDeliveryAttemptId],
      references: [emailDeliveryAttempts.id],
    }),
  }),
);
