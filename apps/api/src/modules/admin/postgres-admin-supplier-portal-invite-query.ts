import { supplierPortalInvites } from "@shop/database";
import { desc, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function listLatestSupplierPortalInvites(
  db: ApiDatabase,
  contactIds: readonly string[],
) {
  if (contactIds.length === 0) {
    return new Map<string, Awaited<ReturnType<typeof queryInvites>>[number]>();
  }

  const rows = await queryInvites(db, contactIds);
  const latestByContactId = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    if (!latestByContactId.has(row.contactId)) {
      latestByContactId.set(row.contactId, row);
    }
  }

  return latestByContactId;
}

async function queryInvites(db: ApiDatabase, contactIds: readonly string[]) {
  return db
    .select({
      contactId: supplierPortalInvites.contactId,
      createdAt: supplierPortalInvites.createdAt,
      deliveryReason: supplierPortalInvites.deliveryReason,
      deliveryStatus: supplierPortalInvites.deliveryStatus,
      expiresAt: supplierPortalInvites.expiresAt,
      recipientEmail: supplierPortalInvites.recipientEmail,
    })
    .from(supplierPortalInvites)
    .where(inArray(supplierPortalInvites.contactId, contactIds))
    .orderBy(
      desc(supplierPortalInvites.createdAt),
      desc(supplierPortalInvites.id),
    );
}
