import type {
  AdminCreateSupplierContactRequest,
  AdminLinkSupplierContactPortalRequest,
} from "@shop/contracts";
import { supplierContacts, users } from "@shop/database";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  supplierContactInactiveError,
  supplierContactNotFoundError,
  supplierContactUserAlreadyLinkedError,
} from "./postgres-admin-supplier-contact-errors.js";
import type { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  findSupplier,
  resolveUserId,
} from "./postgres-admin-supplier-write.support.js";
import { assignRoleRecord } from "./postgres-admin-user-access-write-commands.js";

export { inviteSupplierContactPortal } from "./postgres-admin-supplier-contact-invite.js";

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
