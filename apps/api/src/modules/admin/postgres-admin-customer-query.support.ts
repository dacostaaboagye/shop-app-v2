import type {
  AdminCustomerListQuery,
  AdminCustomerSummary,
} from "@shop/contracts";
import {
  customerAddresses,
  customerContacts,
  customers,
  users,
} from "@shop/database";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export function getCustomerFilter(input: AdminCustomerListQuery) {
  const filters = [];
  if (input.q) {
    const pattern = `%${input.q}%`;
    filters.push(
      or(
        ilike(customers.reference, pattern),
        ilike(customers.displayName, pattern),
        ilike(customers.legalName, pattern),
        ilike(customers.taxNumber, pattern),
      ),
    );
  }
  if (input.status !== "all") filters.push(eq(customers.status, input.status));
  if (input.type !== "all") {
    filters.push(eq(customers.customerType, input.type));
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

export function getCustomerSortExpression(
  sort: AdminCustomerListQuery["sort"],
  dir: AdminCustomerListQuery["dir"],
) {
  if (sort === "createdAt") {
    return dir === "desc"
      ? desc(customers.createdAt)
      : asc(customers.createdAt);
  }
  if (sort === "status") {
    return dir === "desc" ? desc(customers.status) : asc(customers.status);
  }
  return dir === "desc"
    ? desc(customers.displayName)
    : asc(customers.displayName);
}

export async function listCustomerContacts(
  db: ApiDatabase,
  customerIds: string[],
) {
  if (customerIds.length === 0) return [];

  return db
    .select({
      customerId: customerContacts.customerId,
      email: customerContacts.email,
      id: customerContacts.id,
      isPrimary: customerContacts.isPrimary,
      name: customerContacts.name,
      phone: customerContacts.phone,
      receivesDeliveryUpdates: customerContacts.receivesDeliveryUpdates,
      receivesInvoices: customerContacts.receivesInvoices,
      reference: customerContacts.reference,
      roleTitle: customerContacts.roleTitle,
      status: customerContacts.status,
      userSlug: users.slug,
    })
    .from(customerContacts)
    .leftJoin(users, eq(users.id, customerContacts.userId))
    .where(inArray(customerContacts.customerId, customerIds))
    .orderBy(desc(customerContacts.isPrimary), asc(customerContacts.name));
}

export async function listCustomerAddresses(
  db: ApiDatabase,
  customerId: string,
) {
  return db
    .select({
      addressLines: customerAddresses.addressLines,
      city: customerAddresses.city,
      countryCode: customerAddresses.countryCode,
      isDefaultBilling: customerAddresses.isDefaultBilling,
      isDefaultShipping: customerAddresses.isDefaultShipping,
      label: customerAddresses.label,
      recipientName: customerAddresses.recipientName,
      recipientPhone: customerAddresses.recipientPhone,
      reference: customerAddresses.reference,
      region: customerAddresses.region,
      status: customerAddresses.status,
      type: customerAddresses.type,
    })
    .from(customerAddresses)
    .where(eq(customerAddresses.customerId, customerId))
    .orderBy(
      desc(customerAddresses.isDefaultBilling),
      asc(customerAddresses.label),
    );
}

export function toCustomerSummary(
  row: {
    addressCount?: number | string | null;
    contactCount?: number | string | null;
    createdAt: Date;
    customerType: "individual" | "business";
    defaultCurrencyCode: string | null;
    displayName: string;
    legalName: string | null;
    paymentTermsDays: number;
    reference: string;
    slug: string;
    status: "active" | "inactive" | "blocked";
    taxNumber: string | null;
  },
  primaryContact: {
    email: string | null;
    name: string;
    phone: string | null;
    reference: string;
  } | null,
): AdminCustomerSummary {
  return {
    addressCount: Number(row.addressCount ?? 0),
    contactCount: Number(row.contactCount ?? 0),
    createdAt: row.createdAt.toISOString(),
    customerType: row.customerType,
    defaultCurrencyCode: row.defaultCurrencyCode,
    displayName: row.displayName,
    legalName: row.legalName,
    paymentTermsDays: row.paymentTermsDays,
    primaryContact: primaryContact
      ? {
          contactReference: primaryContact.reference,
          email: primaryContact.email,
          name: primaryContact.name,
          phone: primaryContact.phone,
        }
      : null,
    reference: row.reference,
    slug: row.slug,
    status: row.status,
    taxNumber: row.taxNumber,
  };
}
