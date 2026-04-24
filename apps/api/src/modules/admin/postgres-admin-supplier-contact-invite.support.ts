import { createHash } from "node:crypto";
import { supplierContacts, users } from "@shop/database";
import { and, eq, ne } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { EmailDeliveryStatus } from "../messaging/email-service.types.js";
import { supplierContactUserAlreadyLinkedError } from "./postgres-admin-supplier-contact-errors.js";

export async function ensureUserCanLinkToSupplierContact(
  db: ApiDatabase,
  input: { contactReference: string; userId: string },
) {
  const [existingContact] = await db
    .select({ id: supplierContacts.id })
    .from(supplierContacts)
    .where(
      and(
        eq(supplierContacts.userId, input.userId),
        ne(supplierContacts.id, input.contactReference),
      ),
    )
    .limit(1);
  if (existingContact) throw supplierContactUserAlreadyLinkedError();
}

export async function findUserByEmail(db: ApiDatabase, email: string) {
  const [user] = await db
    .select({ id: users.id, slug: users.slug })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function toInviteDeliverySnapshot(error: unknown): {
  attemptId: string | null;
  deliveryReason: string | null;
  deliveryStatus: EmailDeliveryStatus;
} {
  if (!(error instanceof AppError)) {
    return {
      attemptId: null,
      deliveryReason: error instanceof Error ? error.message : String(error),
      deliveryStatus: "failed",
    };
  }

  const details = error.details;
  const status =
    details?.status === "bounced" ||
    details?.status === "complained" ||
    details?.status === "suppressed" ||
    details?.status === "failed"
      ? details.status
      : "failed";

  return {
    attemptId:
      typeof details?.attemptId === "string" ? details.attemptId : null,
    deliveryReason:
      typeof details?.statusReason === "string"
        ? details.statusReason
        : typeof details?.failureReason === "string"
          ? details.failureReason
          : error.message,
    deliveryStatus: status,
  };
}
