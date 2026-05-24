import type {
  AdminCustomerDetail,
  AdminCustomerListQuery,
} from "@shop/contracts";
import {
  customerAddresses,
  customerContacts,
  customerEvents,
  customers,
} from "@shop/database";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AdminCustomerQueryRepository } from "./admin-customer-query.service.js";
import {
  getCustomerFilter,
  getCustomerSortExpression,
  listCustomerAddresses,
  listCustomerContacts,
  toCustomerSummary,
} from "./postgres-admin-customer-query.support.js";

export class PostgresAdminCustomerQueryRepository
  implements AdminCustomerQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getCustomer(slug: string): Promise<AdminCustomerDetail | null> {
    const [row] = await this.db
      .select({
        addressCount: sql<number>`cast(count(distinct ${customerAddresses.id}) as int)`,
        contactCount: sql<number>`cast(count(distinct ${customerContacts.id}) as int)`,
        createdAt: customers.createdAt,
        creditLimitAmount: customers.creditLimitAmount,
        customerType: customers.customerType,
        defaultCurrencyCode: customers.defaultCurrencyCode,
        displayName: customers.displayName,
        id: customers.id,
        legalName: customers.legalName,
        notes: customers.notes,
        paymentTermsDays: customers.paymentTermsDays,
        reference: customers.reference,
        slug: customers.slug,
        status: customers.status,
        taxNumber: customers.taxNumber,
      })
      .from(customers)
      .leftJoin(customerContacts, eq(customerContacts.customerId, customers.id))
      .leftJoin(
        customerAddresses,
        eq(customerAddresses.customerId, customers.id),
      )
      .where(eq(customers.slug, slug))
      .groupBy(customers.id)
      .limit(1);

    if (!row) return null;

    const [contacts, addresses, events] = await Promise.all([
      listCustomerContacts(this.db, [row.id]),
      listCustomerAddresses(this.db, row.id),
      this.listCustomerEvents(row.id),
    ]);
    const primaryContact =
      contacts.find((contact) => contact.isPrimary) ?? null;

    return {
      ...toCustomerSummary(row, primaryContact),
      addresses: addresses.map((address) => ({
        addressLines: address.addressLines,
        addressReference: address.reference,
        city: address.city,
        countryCode: address.countryCode,
        isDefaultBilling: address.isDefaultBilling,
        isDefaultShipping: address.isDefaultShipping,
        label: address.label,
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        region: address.region,
        status: address.status,
        type: address.type,
      })),
      contacts: contacts.map((contact) => ({
        contactReference: contact.reference,
        email: contact.email,
        isPrimary: contact.isPrimary,
        name: contact.name,
        phone: contact.phone,
        receivesDeliveryUpdates: contact.receivesDeliveryUpdates,
        receivesInvoices: contact.receivesInvoices,
        roleTitle: contact.roleTitle,
        status: contact.status,
        userSlug: contact.userSlug,
      })),
      creditLimitAmount: row.creditLimitAmount,
      events: events.map((event) => ({
        eventType: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        summary: event.summary,
      })),
      notes: row.notes,
    };
  }

  async listCustomers(input: AdminCustomerListQuery) {
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;
    const filter = getCustomerFilter(input);

    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(customers)
        .where(filter),
      this.db
        .select({
          addressCount: sql<number>`cast(count(distinct ${customerAddresses.id}) as int)`,
          contactCount: sql<number>`cast(count(distinct ${customerContacts.id}) as int)`,
          createdAt: customers.createdAt,
          customerType: customers.customerType,
          defaultCurrencyCode: customers.defaultCurrencyCode,
          displayName: customers.displayName,
          id: customers.id,
          legalName: customers.legalName,
          paymentTermsDays: customers.paymentTermsDays,
          reference: customers.reference,
          slug: customers.slug,
          status: customers.status,
          taxNumber: customers.taxNumber,
        })
        .from(customers)
        .leftJoin(
          customerContacts,
          eq(customerContacts.customerId, customers.id),
        )
        .leftJoin(
          customerAddresses,
          eq(customerAddresses.customerId, customers.id),
        )
        .where(filter)
        .groupBy(customers.id)
        .orderBy(getCustomerSortExpression(input.sort, input.dir))
        .limit(pageSize)
        .offset(offset),
    ]);

    const contacts = await listCustomerContacts(
      this.db,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) => {
        const primaryContact =
          contacts.find(
            (contact) => contact.customerId === row.id && contact.isPrimary,
          ) ?? null;
        return toCustomerSummary(row, primaryContact);
      }),
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }

  private listCustomerEvents(customerId: string) {
    return this.db
      .select({
        eventType: customerEvents.eventType,
        occurredAt: customerEvents.occurredAt,
        summary: customerEvents.summary,
      })
      .from(customerEvents)
      .where(eq(customerEvents.customerId, customerId))
      .orderBy(desc(customerEvents.occurredAt), asc(customerEvents.id))
      .limit(25);
  }
}
