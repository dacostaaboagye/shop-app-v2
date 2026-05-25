import { customerAddresses, customerContacts, customers } from "@shop/database";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type ManagerCustomerLookupItem = {
  billingAddressLines: string[] | null;
  contacts: Array<{
    contactReference: string;
    email: string | null;
    name: string;
    phone: string | null;
    receivesInvoices: boolean;
  }>;
  displayName: string;
  reference: string;
  slug: string;
  taxNumber: string | null;
};

export type ManagerCustomerLookupRepository = {
  searchCustomers: (input: {
    limit: number;
    q: string;
  }) => Promise<ManagerCustomerLookupItem[]>;
};

export class PostgresManagerCustomerLookupRepository
  implements ManagerCustomerLookupRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async searchCustomers(input: {
    limit: number;
    q: string;
  }): Promise<ManagerCustomerLookupItem[]> {
    const q = input.q.trim();
    const filters = [eq(customers.status, "active")];

    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(customers.reference, pattern),
        ilike(customers.displayName, pattern),
        ilike(customers.legalName, pattern),
        ilike(customers.taxNumber, pattern),
        ilike(customerContacts.name, pattern),
        ilike(customerContacts.email, pattern),
      );
      if (search) filters.push(search);
    }

    const rows = await this.db
      .select({
        displayName: customers.displayName,
        id: customers.id,
        reference: customers.reference,
        slug: customers.slug,
        taxNumber: customers.taxNumber,
      })
      .from(customers)
      .leftJoin(
        customerContacts,
        and(
          eq(customerContacts.customerId, customers.id),
          eq(customerContacts.status, "active"),
        ),
      )
      .where(and(...filters))
      .groupBy(customers.id)
      .orderBy(asc(customers.displayName), asc(customers.reference))
      .limit(input.limit);

    const [contacts, addresses] = await Promise.all([
      this.listContacts(rows.map((row) => row.id)),
      this.listBillingAddresses(rows.map((row) => row.id)),
    ]);

    return rows.map((row) => ({
      billingAddressLines:
        addresses.find((address) => address.customerId === row.id)
          ?.addressLines ?? null,
      contacts: contacts
        .filter((contact) => contact.customerId === row.id)
        .map((contact) => ({
          contactReference: contact.reference,
          email: contact.email,
          name: contact.name,
          phone: contact.phone,
          receivesInvoices: contact.receivesInvoices,
        })),
      displayName: row.displayName,
      reference: row.reference,
      slug: row.slug,
      taxNumber: row.taxNumber,
    }));
  }

  private listContacts(customerIds: string[]) {
    if (customerIds.length === 0) return Promise.resolve([]);

    return this.db
      .select({
        customerId: customerContacts.customerId,
        email: customerContacts.email,
        name: customerContacts.name,
        phone: customerContacts.phone,
        receivesInvoices: customerContacts.receivesInvoices,
        reference: customerContacts.reference,
      })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.status, "active"),
          inArray(customerContacts.customerId, customerIds),
        ),
      )
      .orderBy(
        desc(customerContacts.isPrimary),
        desc(customerContacts.receivesInvoices),
        asc(customerContacts.name),
      );
  }

  private listBillingAddresses(customerIds: string[]) {
    if (customerIds.length === 0) return Promise.resolve([]);

    return this.db
      .select({
        addressLines: customerAddresses.addressLines,
        customerId: customerAddresses.customerId,
      })
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.status, "active"),
          inArray(customerAddresses.customerId, customerIds),
          or(
            eq(customerAddresses.type, "billing"),
            eq(customerAddresses.type, "both"),
          ),
        ),
      )
      .orderBy(
        desc(customerAddresses.isDefaultBilling),
        asc(customerAddresses.label),
      );
  }
}
