import { customerAddresses, customerContacts, customers } from "@shop/database";
import { and, asc, desc, eq, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type {
  SalesCustomerLinkRequest,
  SalesCustomerLinkResolver,
  SalesCustomerLinkSelection,
} from "./sales-customer-link.types.js";

export class PostgresSalesCustomerLinkRepository
  implements SalesCustomerLinkResolver
{
  constructor(private readonly db: ApiDatabase) {}

  async resolveCustomerLink(
    input: SalesCustomerLinkRequest,
  ): Promise<SalesCustomerLinkSelection | null> {
    const customerSlug = input.customerSlug?.trim();
    if (!customerSlug) return null;

    const [customer] = await this.db
      .select({
        displayName: customers.displayName,
        id: customers.id,
        reference: customers.reference,
        slug: customers.slug,
        status: customers.status,
        taxNumber: customers.taxNumber,
      })
      .from(customers)
      .where(eq(customers.slug, customerSlug))
      .limit(1);

    if (!customer) throw customerNotFoundError(customerSlug);
    if (customer.status !== "active") {
      throw customerUnavailableError(customer.displayName);
    }

    const [contact, address] = await Promise.all([
      this.resolveContact({
        customerId: customer.id,
        reference: input.customerContactReference ?? null,
      }),
      this.resolveBillingAddress(customer.id),
    ]);

    return {
      customerContactId: contact?.id ?? null,
      customerContactReference: contact?.reference ?? null,
      customerId: customer.id,
      customerReference: customer.reference,
      customerSlug: customer.slug,
      snapshot: {
        billingAddressLines: address?.addressLines ?? null,
        email: contact?.email ?? null,
        name: contact?.name ?? customer.displayName,
        phone: contact?.phone ?? null,
        taxNumber: customer.taxNumber ?? null,
      },
    };
  }

  private async resolveContact(input: {
    customerId: string;
    reference: string | null;
  }) {
    if (input.reference) {
      const [contact] = await this.db
        .select({
          email: customerContacts.email,
          id: customerContacts.id,
          name: customerContacts.name,
          phone: customerContacts.phone,
          reference: customerContacts.reference,
          status: customerContacts.status,
        })
        .from(customerContacts)
        .where(
          and(
            eq(customerContacts.customerId, input.customerId),
            eq(customerContacts.reference, input.reference),
          ),
        )
        .limit(1);

      if (!contact) throw contactNotFoundError(input.reference);
      if (contact.status !== "active") {
        throw contactUnavailableError(input.reference);
      }
      return contact;
    }

    const [contact] = await this.db
      .select({
        email: customerContacts.email,
        id: customerContacts.id,
        name: customerContacts.name,
        phone: customerContacts.phone,
        reference: customerContacts.reference,
        status: customerContacts.status,
      })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.customerId, input.customerId),
          eq(customerContacts.status, "active"),
        ),
      )
      .orderBy(
        desc(customerContacts.isPrimary),
        desc(customerContacts.receivesInvoices),
        asc(customerContacts.name),
      )
      .limit(1);

    return contact ?? null;
  }

  private async resolveBillingAddress(customerId: string) {
    const [address] = await this.db
      .select({
        addressLines: customerAddresses.addressLines,
      })
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.status, "active"),
          or(
            eq(customerAddresses.type, "billing"),
            eq(customerAddresses.type, "both"),
          ),
        ),
      )
      .orderBy(
        desc(customerAddresses.isDefaultBilling),
        asc(customerAddresses.label),
      )
      .limit(1);

    return address ?? null;
  }
}

function customerNotFoundError(customerSlug: string) {
  return new AppError({
    code: "not_found",
    detail: `Customer ${customerSlug} does not exist.`,
    statusCode: 404,
    title: "Customer not found",
  });
}

function customerUnavailableError(customerName: string) {
  return new AppError({
    code: "conflict",
    detail: `Customer ${customerName} is not active.`,
    statusCode: 409,
    title: "Customer unavailable",
  });
}

function contactNotFoundError(reference: string) {
  return new AppError({
    code: "not_found",
    detail: `Customer contact ${reference} does not exist for this customer.`,
    statusCode: 404,
    title: "Customer contact not found",
  });
}

function contactUnavailableError(reference: string) {
  return new AppError({
    code: "conflict",
    detail: `Customer contact ${reference} is not active.`,
    statusCode: 409,
    title: "Customer contact unavailable",
  });
}
