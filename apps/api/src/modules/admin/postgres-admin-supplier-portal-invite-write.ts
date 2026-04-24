import { supplierPortalInvites } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailDeliveryStatus } from "../messaging/email-service.types.js";

export async function recordSupplierPortalInvite(input: {
  contactId: string;
  createdAt: Date;
  deliveryAttemptId: string | null;
  deliveryReason: string | null;
  deliveryStatus: EmailDeliveryStatus;
  expiresAt: Date;
  invitedBy: string;
  recipientEmail: string;
  userId: string;
  db: ApiDatabase;
}) {
  await input.db.insert(supplierPortalInvites).values({
    contactId: input.contactId,
    createdAt: input.createdAt,
    deliveryReason: input.deliveryReason,
    deliveryStatus: input.deliveryStatus,
    emailDeliveryAttemptId: input.deliveryAttemptId,
    expiresAt: input.expiresAt,
    invitedBy: input.invitedBy,
    recipientEmail: input.recipientEmail,
    userId: input.userId,
  });
}
