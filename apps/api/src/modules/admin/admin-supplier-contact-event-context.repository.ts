import { supplierContacts, suppliers, users } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SupplierPortalContactEventContext } from "./admin-supplier-events.js";

export type AdminSupplierContactEventContextRepository = {
  getPortalContactEventContext(input: {
    contactReference: string;
    supplierSlug: string;
  }): Promise<SupplierPortalContactEventContext | null>;
};

export class PostgresAdminSupplierContactEventContextRepository
  implements AdminSupplierContactEventContextRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getPortalContactEventContext(input: {
    contactReference: string;
    supplierSlug: string;
  }): Promise<SupplierPortalContactEventContext | null> {
    const [row] = await this.db
      .select({
        contactEmail: supplierContacts.email,
        contactFirstName: supplierContacts.firstName,
        contactLastName: supplierContacts.lastName,
        contactReference: supplierContacts.id,
        supplierName: suppliers.name,
        supplierSlug: suppliers.slug,
        userSlug: users.slug,
      })
      .from(supplierContacts)
      .innerJoin(suppliers, eq(suppliers.id, supplierContacts.supplierId))
      .leftJoin(users, eq(users.id, supplierContacts.userId))
      .where(
        and(
          eq(supplierContacts.id, input.contactReference),
          eq(suppliers.slug, input.supplierSlug),
        ),
      );

    if (!row) {
      return null;
    }

    return {
      contactEmail: row.contactEmail,
      contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
      contactReference: row.contactReference,
      supplierName: row.supplierName,
      supplierSlug: row.supplierSlug,
      userSlug: row.userSlug,
    };
  }
}
