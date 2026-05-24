import type {
  AdminCreateCustomerAddressRequest,
  AdminCreateCustomerContactRequest,
  AdminCreateCustomerRequest,
  AdminUpdateCustomerRequest,
} from "@shop/contracts";
import {
  customerAddresses,
  customerContacts,
  customerEvents,
  customers,
} from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminCustomerWriteRepository } from "./admin-customer-write.service.js";
import { PostgresAdminCustomerQueryRepository } from "./postgres-admin-customer-query.repository.js";

export class PostgresAdminCustomerWriteRepository
  implements AdminCustomerWriteRepository
{
  private readonly reader: PostgresAdminCustomerQueryRepository;

  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
  ) {
    this.reader = new PostgresAdminCustomerQueryRepository(db);
  }

  async addAddress(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerAddressRequest;
    reference: string;
    customerSlug: string;
  }) {
    const customer = await this.findCustomer(input.customerSlug);
    if (!customer) return null;

    await this.db.transaction(async (tx) => {
      if (input.payload.isDefaultBilling) {
        await tx
          .update(customerAddresses)
          .set({ isDefaultBilling: false, updatedAt: input.now })
          .where(eq(customerAddresses.customerId, customer.id));
      }
      if (input.payload.isDefaultShipping) {
        await tx
          .update(customerAddresses)
          .set({ isDefaultShipping: false, updatedAt: input.now })
          .where(eq(customerAddresses.customerId, customer.id));
      }
      await tx.insert(customerAddresses).values({
        addressLines: input.payload.addressLines,
        city: input.payload.city ?? null,
        countryCode: input.payload.countryCode ?? null,
        createdAt: input.now,
        customerId: customer.id,
        isDefaultBilling: input.payload.isDefaultBilling,
        isDefaultShipping: input.payload.isDefaultShipping,
        label: input.payload.label,
        recipientName: input.payload.recipientName ?? null,
        recipientPhone: input.payload.recipientPhone ?? null,
        reference: input.reference,
        region: input.payload.region ?? null,
        type: input.payload.type,
        updatedAt: input.now,
      });
      await insertCustomerEvent(tx, {
        actorId: input.actorId,
        customerId: customer.id,
        eventType: "address_added",
        now: input.now,
        summary: `Address added: ${input.payload.label}.`,
      });
    });

    return this.reader.getCustomer(input.customerSlug);
  }

  async addContact(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerContactRequest;
    reference: string;
    customerSlug: string;
  }) {
    const customer = await this.findCustomer(input.customerSlug);
    if (!customer) return null;

    await this.db.transaction(async (tx) => {
      if (input.payload.isPrimary) {
        await tx
          .update(customerContacts)
          .set({ isPrimary: false, updatedAt: input.now })
          .where(eq(customerContacts.customerId, customer.id));
      }
      await tx.insert(customerContacts).values({
        createdAt: input.now,
        customerId: customer.id,
        email: input.payload.email ?? null,
        isPrimary: input.payload.isPrimary,
        name: input.payload.name,
        phone: input.payload.phone ?? null,
        receivesDeliveryUpdates: input.payload.receivesDeliveryUpdates,
        receivesInvoices: input.payload.receivesInvoices,
        reference: input.reference,
        roleTitle: input.payload.roleTitle ?? null,
        status: input.payload.status,
        updatedAt: input.now,
      });
      await insertCustomerEvent(tx, {
        actorId: input.actorId,
        customerId: customer.id,
        eventType: "contact_added",
        now: input.now,
        summary: `Contact added: ${input.payload.name}.`,
      });
    });

    return this.reader.getCustomer(input.customerSlug);
  }

  async createCustomer(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCustomerRequest;
    reference: string;
  }) {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "customer",
      value: input.payload.displayName,
    });

    await this.db.transaction(async (tx) => {
      const [customer] = await tx
        .insert(customers)
        .values({
          createdAt: input.now,
          createdBy: input.actorId,
          creditLimitAmount: input.payload.creditLimitAmount ?? null,
          customerType: input.payload.customerType,
          defaultCurrencyCode: normalizeCurrency(
            input.payload.defaultCurrencyCode,
          ),
          displayName: input.payload.displayName,
          legalName: input.payload.legalName ?? null,
          notes: input.payload.notes ?? null,
          paymentTermsDays: input.payload.paymentTermsDays,
          reference: input.reference,
          slug,
          status: input.payload.status,
          taxNumber: input.payload.taxNumber ?? null,
          updatedAt: input.now,
        })
        .returning({ id: customers.id });

      if (!customer) throw new Error("Unable to insert customer.");
      await insertCustomerEvent(tx, {
        actorId: input.actorId,
        customerId: customer.id,
        eventType: "customer_created",
        now: input.now,
        summary: `Customer created: ${input.payload.displayName}.`,
      });
    });

    const created = await this.reader.getCustomer(slug);
    if (!created) throw new Error("Unable to load created customer.");
    return created;
  }

  async updateCustomer(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCustomerRequest;
    customerSlug: string;
  }) {
    const customer = await this.findCustomer(input.customerSlug);
    if (!customer) return null;

    await this.db.transaction(async (tx) => {
      await tx
        .update(customers)
        .set({
          creditLimitAmount: input.payload.creditLimitAmount ?? undefined,
          customerType: input.payload.customerType,
          defaultCurrencyCode: normalizeCurrency(
            input.payload.defaultCurrencyCode,
          ),
          displayName: input.payload.displayName,
          legalName: input.payload.legalName,
          notes: input.payload.notes,
          paymentTermsDays: input.payload.paymentTermsDays,
          status: input.payload.status,
          taxNumber: input.payload.taxNumber,
          updatedAt: input.now,
        })
        .where(eq(customers.id, customer.id));
      await insertCustomerEvent(tx, {
        actorId: input.actorId,
        customerId: customer.id,
        eventType: "customer_updated",
        now: input.now,
        summary: `Customer updated: ${customer.displayName}.`,
      });
    });

    return this.reader.getCustomer(input.customerSlug);
  }

  private async findCustomer(slug: string) {
    const [customer] = await this.db
      .select({ displayName: customers.displayName, id: customers.id })
      .from(customers)
      .where(eq(customers.slug, slug))
      .limit(1);
    return customer ?? null;
  }
}

function normalizeCurrency(value: string | null | undefined) {
  return value ? value.trim().toUpperCase() : null;
}

async function insertCustomerEvent(
  tx: Parameters<Parameters<ApiDatabase["transaction"]>[0]>[0],
  input: {
    actorId: string;
    customerId: string;
    eventType:
      | "address_added"
      | "contact_added"
      | "customer_created"
      | "customer_updated";
    now: Date;
    summary: string;
  },
) {
  await tx.insert(customerEvents).values({
    actorId: input.actorId,
    customerId: input.customerId,
    eventType: input.eventType,
    occurredAt: input.now,
    summary: input.summary,
  });
}
