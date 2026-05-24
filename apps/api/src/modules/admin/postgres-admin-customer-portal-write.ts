import type { AdminLinkCustomerContactPortalRequest } from "@shop/contracts";
import { customerContacts, users } from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  customerContactInactiveError,
  customerContactNotFoundError,
} from "./postgres-admin-customer-contact-errors.js";
import type { PostgresAdminCustomerQueryRepository } from "./postgres-admin-customer-query.repository.js";
import {
  findCustomer,
  insertCustomerEvent,
} from "./postgres-admin-customer-write.support.js";
import { resolveUser } from "./postgres-admin-user-access-write.support.js";
import { assignRoleRecord } from "./postgres-admin-user-access-write-commands.js";

export async function linkCustomerContactPortal(input: {
  actorId: string;
  contactReference: string;
  customerSlug: string;
  db: ApiDatabase;
  now: Date;
  payload: AdminLinkCustomerContactPortalRequest;
  reader: PostgresAdminCustomerQueryRepository;
}) {
  const customer = await findCustomer(input.db, input.customerSlug);
  if (!customer) return null;

  await input.db.transaction(async (tx) => {
    const user = await resolveUser(tx, input.payload.userSlug);
    const [contact] = await tx
      .select({
        id: customerContacts.id,
        name: customerContacts.name,
        status: customerContacts.status,
      })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.reference, input.contactReference),
          eq(customerContacts.customerId, customer.id),
        ),
      )
      .limit(1);
    if (!contact) throw customerContactNotFoundError();
    if (contact.status === "inactive") throw customerContactInactiveError();

    await tx
      .update(customerContacts)
      .set({ updatedAt: input.now, userId: user.id })
      .where(eq(customerContacts.id, contact.id));

    await tx
      .update(users)
      .set({ preferredPortal: "customer", updatedAt: input.now })
      .where(and(eq(users.id, user.id), isNull(users.preferredPortal)));

    await assignRoleRecord(tx, {
      actorId: input.actorId,
      locationSlug: null,
      now: input.now,
      reason: `Customer portal linked for ${input.customerSlug}.`,
      roleSlug: "customer",
      userSlug: input.payload.userSlug,
    });

    await insertCustomerEvent(tx, {
      actorId: input.actorId,
      customerId: customer.id,
      eventType: "portal_linked",
      now: input.now,
      summary: `Portal access linked for ${contact.name}.`,
    });
  });

  return input.reader.getCustomer(input.customerSlug);
}

export async function unlinkCustomerContactPortal(input: {
  actorId: string;
  contactReference: string;
  customerSlug: string;
  db: ApiDatabase;
  now: Date;
  reader: PostgresAdminCustomerQueryRepository;
}) {
  const customer = await findCustomer(input.db, input.customerSlug);
  if (!customer) return null;

  await input.db.transaction(async (tx) => {
    const [contact] = await tx
      .select({ id: customerContacts.id, name: customerContacts.name })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.reference, input.contactReference),
          eq(customerContacts.customerId, customer.id),
        ),
      )
      .limit(1);
    if (!contact) throw customerContactNotFoundError();

    await tx
      .update(customerContacts)
      .set({ updatedAt: input.now, userId: null })
      .where(eq(customerContacts.id, contact.id));

    await insertCustomerEvent(tx, {
      actorId: input.actorId,
      customerId: customer.id,
      eventType: "portal_unlinked",
      now: input.now,
      summary: `Portal access revoked for ${contact.name}.`,
    });
  });

  return input.reader.getCustomer(input.customerSlug);
}
