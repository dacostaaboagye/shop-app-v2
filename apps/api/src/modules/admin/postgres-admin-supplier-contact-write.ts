import { createHash, randomBytes } from "node:crypto";
import type {
  AdminCreateSupplierContactRequest,
  AdminLinkSupplierContactPortalRequest,
} from "@shop/contracts";
import {
  passwordResetTokens,
  supplierContacts,
  suppliers,
  users,
} from "@shop/database";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { EmailService } from "../messaging/email.service.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  findSupplier,
  resolveUserId,
} from "./postgres-admin-supplier-write.support.js";
import { assignRoleRecord } from "./postgres-admin-user-access-write-commands.js";

const PASSWORD_SETUP_TOKEN_BYTES = 32;
const PASSWORD_SETUP_TTL_MINUTES = 60;

export async function addSupplierContact(input: {
  actorId: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminCreateSupplierContactRequest;
  reader: PostgresAdminSupplierQueryRepository;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;
  const userId = input.payload.userSlug
    ? await resolveUserId(input.db, input.payload.userSlug)
    : null;

  await input.db.transaction(async (tx) => {
    if (input.payload.isPrimary) {
      await tx
        .update(supplierContacts)
        .set({ isPrimary: false, updatedAt: input.now })
        .where(eq(supplierContacts.supplierId, supplier.id));
    }

    await tx.insert(supplierContacts).values({
      createdAt: input.now,
      email: input.payload.email ?? null,
      firstName: input.payload.firstName,
      isPrimary: input.payload.isPrimary,
      jobTitle: input.payload.jobTitle ?? null,
      lastName: input.payload.lastName,
      phone: input.payload.phone ?? null,
      status: input.payload.status,
      supplierId: supplier.id,
      updatedAt: input.now,
      userId,
    });
  });

  return input.reader.getSupplier(input.supplierSlug);
}

export async function removeSupplierContact(input: {
  contactReference: string;
  db: ApiDatabase;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return "not_found" as const;
  const [contact] = await input.db
    .select({ isPrimary: supplierContacts.isPrimary })
    .from(supplierContacts)
    .where(
      and(
        eq(supplierContacts.id, input.contactReference),
        eq(supplierContacts.supplierId, supplier.id),
      ),
    )
    .limit(1);
  if (!contact) return "not_found" as const;
  if (contact.isPrimary) return "primary_contact" as const;

  await input.db
    .delete(supplierContacts)
    .where(eq(supplierContacts.id, input.contactReference));
  return "deleted" as const;
}

export async function linkSupplierContactPortal(input: {
  actorId: string;
  contactReference: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminLinkSupplierContactPortalRequest;
  reader: PostgresAdminSupplierQueryRepository;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;

  await input.db.transaction(async (tx) => {
    const userId = await resolveUserId(tx, input.payload.userSlug);
    const [contact] = await tx
      .select({ id: supplierContacts.id, status: supplierContacts.status })
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

    const [existingContact] = await tx
      .select({ id: supplierContacts.id })
      .from(supplierContacts)
      .where(
        and(
          eq(supplierContacts.userId, userId),
          ne(supplierContacts.id, input.contactReference),
        ),
      )
      .limit(1);
    if (existingContact) throw supplierContactUserAlreadyLinkedError();

    await tx
      .update(supplierContacts)
      .set({ updatedAt: input.now, userId })
      .where(eq(supplierContacts.id, input.contactReference));

    await tx
      .update(users)
      .set({ preferredPortal: "supplier", updatedAt: input.now })
      .where(and(eq(users.id, userId), isNull(users.preferredPortal)));

    await assignRoleRecord(tx, {
      actorId: input.actorId,
      locationSlug: null,
      now: input.now,
      reason: `Supplier portal linked for ${input.supplierSlug}.`,
      roleSlug: "supplier",
      userSlug: input.payload.userSlug,
    });
  });

  return input.reader.getSupplier(input.supplierSlug);
}

export async function unlinkSupplierContactPortal(input: {
  contactReference: string;
  db: ApiDatabase;
  now: Date;
  reader: PostgresAdminSupplierQueryRepository;
  supplierSlug: string;
}) {
  const supplier = await findSupplier(input.db, input.supplierSlug);
  if (!supplier) return null;

  const [contact] = await input.db
    .select({ id: supplierContacts.id })
    .from(supplierContacts)
    .where(
      and(
        eq(supplierContacts.id, input.contactReference),
        eq(supplierContacts.supplierId, supplier.id),
      ),
    )
    .limit(1);
  if (!contact) throw supplierContactNotFoundError();

  await input.db
    .update(supplierContacts)
    .set({ updatedAt: input.now, userId: null })
    .where(eq(supplierContacts.id, input.contactReference));

  return input.reader.getSupplier(input.supplierSlug);
}

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
      email: normalizedEmail,
      firstName: contact.firstName,
      supplierName: supplierRow?.name ?? input.supplierSlug,
    };
  });

  if (!input.emailService) throw supplierPortalInviteEmailUnavailableError();
  await input.emailService.sendSupplierInviteEmail({
    firstName: invite.firstName,
    setupUrl: `${input.webBaseUrl}/reset-password?token=${token}`,
    supplierName: invite.supplierName,
    to: invite.email,
  });

  return input.reader.getSupplier(input.supplierSlug);
}

async function ensureUserCanLinkToSupplierContact(
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

async function findUserByEmail(db: ApiDatabase, email: string) {
  const [user] = await db
    .select({ id: users.id, slug: users.slug })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

function supplierContactNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested supplier contact could not be found.",
    statusCode: 404,
    title: "Supplier contact not found",
  });
}

function supplierContactEmailRequiredError() {
  return new AppError({
    code: "validation_error",
    detail:
      "Add an email address to this supplier contact before sending a portal invite.",
    statusCode: 400,
    title: "Supplier contact email required",
  });
}

function supplierContactUserAlreadyLinkedError() {
  return new AppError({
    code: "conflict",
    detail:
      "This user account is already linked to another supplier contact. Unlink it before assigning it again.",
    statusCode: 409,
    title: "Supplier portal user already linked",
  });
}

function supplierContactInactiveError() {
  return new AppError({
    code: "conflict",
    detail:
      "Activate this supplier contact before linking or inviting portal access.",
    statusCode: 409,
    title: "Supplier contact inactive",
  });
}

function supplierPortalInviteEmailUnavailableError() {
  return new AppError({
    code: "internal_error",
    detail: "Supplier invite email delivery is not configured.",
    statusCode: 503,
    title: "Supplier invite unavailable",
  });
}

function supplierPortalInviteFailedError() {
  return new AppError({
    code: "internal_error",
    detail: "The supplier portal invite account could not be created.",
    statusCode: 500,
    title: "Supplier invite failed",
  });
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
