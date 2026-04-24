import { randomBytes } from "node:crypto";
import {
  passwordResetTokens,
  supplierContacts,
  suppliers,
  users,
} from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailService } from "../messaging/email.service.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import {
  supplierContactEmailRequiredError,
  supplierContactInactiveError,
  supplierContactNotFoundError,
  supplierPortalInviteEmailUnavailableError,
  supplierPortalInviteFailedError,
} from "./postgres-admin-supplier-contact-errors.js";
import {
  ensureUserCanLinkToSupplierContact,
  findUserByEmail,
  hashToken,
  toInviteDeliverySnapshot,
} from "./postgres-admin-supplier-contact-invite.support.js";
import { recordSupplierPortalInvite } from "./postgres-admin-supplier-portal-invite-write.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import { findSupplier } from "./postgres-admin-supplier-write.support.js";
import { assignRoleRecord } from "./postgres-admin-user-access-write-commands.js";

const PASSWORD_SETUP_TOKEN_BYTES = 32;
const PASSWORD_SETUP_TTL_MINUTES = 60;

export async function inviteSupplierContactPortal(input: {
  actorId: string;
  contactReference: string;
  db: ApiDatabase;
  emailService: EmailService | null;
  now: Date;
  reader: PostgresAdminSupplierQueryRepository;
  slugAllocator: SlugAllocator;
  supplierSlug: string;
  webBaseUrl: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;

  const token = randomBytes(PASSWORD_SETUP_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    input.now.getTime() + PASSWORD_SETUP_TTL_MINUTES * 60 * 1000,
  );
  const invite = await input.db.transaction(async (tx) => {
    const [contact] = await tx
      .select({
        email: supplierContacts.email,
        firstName: supplierContacts.firstName,
        id: supplierContacts.id,
        lastName: supplierContacts.lastName,
        status: supplierContacts.status,
        userId: supplierContacts.userId,
      })
      .from(supplierContacts)
      .where(
        and(
          eq(supplierContacts.id, input.contactReference),
          eq(supplierContacts.supplierId, supplier.id),
        ),
      )
      .limit(1);
    if (!contact) throw supplierContactNotFoundError();
    if (contact.status === "inactive") throw supplierContactInactiveError();
    if (!contact.email) throw supplierContactEmailRequiredError();

    const normalizedEmail = contact.email.trim().toLowerCase();
    let userSlug: string;
    let userId: string;

    if (contact.userId) {
      const [linkedUser] = await tx
        .select({ id: users.id, slug: users.slug })
        .from(users)
        .where(eq(users.id, contact.userId))
        .limit(1);
      if (!linkedUser) throw supplierContactNotFoundError();
      userId = linkedUser.id;
      userSlug = linkedUser.slug;
    } else {
      const existingUser = await findUserByEmail(tx, normalizedEmail);
      if (existingUser) {
        userId = existingUser.id;
        userSlug = existingUser.slug;
      } else {
        userSlug = await input.slugAllocator.allocateSlug({
          entityType: "user",
          value: `${contact.firstName} ${contact.lastName}`,
        });
        const [createdUser] = await tx
          .insert(users)
          .values({
            createdAt: input.now,
            email: normalizedEmail,
            emailVerified: false,
            firstName: contact.firstName,
            lastName: contact.lastName,
            preferredPortal: "supplier",
            requiresPasswordChange: true,
            slug: userSlug,
            status: "active",
            updatedAt: input.now,
          })
          .returning({ id: users.id, slug: users.slug });
        if (!createdUser) throw supplierPortalInviteFailedError();
        userId = createdUser.id;
        userSlug = createdUser.slug;
      }

      await ensureUserCanLinkToSupplierContact(tx, {
        contactReference: input.contactReference,
        userId,
      });

      await tx
        .update(supplierContacts)
        .set({ updatedAt: input.now, userId })
        .where(eq(supplierContacts.id, input.contactReference));
    }

    await tx
      .update(users)
      .set({ preferredPortal: "supplier", requiresPasswordChange: true })
      .where(eq(users.id, userId));

    await tx
      .update(passwordResetTokens)
      .set({ updatedAt: input.now, usedAt: input.now })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    await tx.insert(passwordResetTokens).values({
      createdAt: input.now,
      expiresAt,
      tokenHash,
      updatedAt: input.now,
      userId,
    });

    await assignRoleRecord(tx, {
      actorId: input.actorId,
      locationSlug: null,
      now: input.now,
      reason: `Supplier portal invited for ${input.supplierSlug}.`,
      roleSlug: "supplier",
      userSlug,
    });

    const [supplierRow] = await tx
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplier.id))
      .limit(1);

    return {
      contactId: contact.id,
      email: normalizedEmail,
      firstName: contact.firstName,
      supplierName: supplierRow?.name ?? input.supplierSlug,
      userId,
    };
  });

  if (!input.emailService) throw supplierPortalInviteEmailUnavailableError();
  try {
    const delivery = await input.emailService.sendSupplierInviteEmail({
      firstName: invite.firstName,
      setupUrl: `${input.webBaseUrl}/reset-password?token=${token}`,
      supplierName: invite.supplierName,
      to: invite.email,
    });

    await recordSupplierPortalInvite({
      contactId: invite.contactId,
      createdAt: input.now,
      db: input.db,
      deliveryAttemptId: delivery.attemptId,
      deliveryReason: delivery.failureReason ?? null,
      deliveryStatus: delivery.status,
      expiresAt,
      invitedBy: input.actorId,
      recipientEmail: invite.email,
      userId: invite.userId,
    });
  } catch (error) {
    const blockedOrFailedDelivery = toInviteDeliverySnapshot(error);

    await recordSupplierPortalInvite({
      contactId: invite.contactId,
      createdAt: input.now,
      db: input.db,
      deliveryAttemptId: blockedOrFailedDelivery.attemptId,
      deliveryReason: blockedOrFailedDelivery.deliveryReason,
      deliveryStatus: blockedOrFailedDelivery.deliveryStatus,
      expiresAt,
      invitedBy: input.actorId,
      recipientEmail: invite.email,
      userId: invite.userId,
    });
    throw error;
  }

  return input.reader.getSupplier(input.supplierSlug);
}
