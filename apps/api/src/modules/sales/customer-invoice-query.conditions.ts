import { invoices } from "@shop/database";
import type { SQL } from "drizzle-orm";
import { eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { CustomerInvoiceListInput } from "./postgres-customer-invoice-query.repository.js";

const ORIGINAL_INVOICE_TYPES = [
  "pos",
  "portal",
  "ecommerce",
  "manual",
] as const;

export function buildCustomerInvoiceConditions(
  input: CustomerInvoiceListInput,
  customerIds: readonly string[],
): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [
    inArray(invoices.customerId, [...customerIds]),
    eq(invoices.classification, "outgoing"),
  ];

  if (input.documentType) {
    conditions.push(documentTypeCondition(input.documentType));
  }
  if (input.status) conditions.push(eq(invoices.status, input.status));
  if (input.currentPayableOnly) {
    conditions.push(
      ne(invoices.type, "credit_note"),
      eq(invoices.status, "confirmed"),
      isNull(invoices.replacementInvoiceId),
    );
  }
  if (input.dateFrom) conditions.push(gte(invoices.createdAt, input.dateFrom));
  if (input.dateTo) conditions.push(lte(invoices.createdAt, input.dateTo));
  if (input.q?.trim()) {
    const pattern = `%${input.q.trim()}%`;
    conditions.push(
      or(
        sql`${invoices.reference} ilike ${pattern}`,
        sql`coalesce(${invoices.customerName}, '') ilike ${pattern}`,
      ) ?? sql`false`,
    );
  }

  return conditions;
}

function documentTypeCondition(
  documentType: "adjusted" | "credit_note" | "invoice",
): SQL<unknown> {
  if (documentType === "credit_note") return eq(invoices.type, "credit_note");
  if (documentType === "adjusted") return eq(invoices.type, "adjusted");
  return inArray(invoices.type, [...ORIGINAL_INVOICE_TYPES]);
}
