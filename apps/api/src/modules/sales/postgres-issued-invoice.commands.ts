import { invoiceLineItems, invoices } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CreateIssuedInvoiceTransactionInput } from "./invoice-issuance.contracts.js";
import { mapInvoice, mapLineItem } from "./postgres-invoice.mappers.js";
import type {
  InvoiceLineItemRecord,
  InvoiceWithLines,
} from "./sales.contracts.js";

export async function insertIssuedInvoice(
  tx: ApiDatabase,
  input: CreateIssuedInvoiceTransactionInput,
  options: { stockMovementIds?: Array<string | null> } = {},
): Promise<InvoiceWithLines> {
  const invoiceRows = await tx
    .insert(invoices)
    .values({
      attributedWorkerId: input.attributedWorkerId,
      classification: input.classification,
      confirmedAt: input.confirmedAt,
      createdBy: input.createdBy,
      customerBillingAddressLines: input.customerBillingAddressLines ?? null,
      customerContactId: input.customerContactId ?? null,
      currencyCode: input.currencyCode,
      currencyScale: input.currencyScale,
      customerEmail: input.customerEmail ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      customerTaxNumber: input.customerTaxNumber ?? null,
      locationId: input.locationId,
      notes: input.notes,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      status: "confirmed",
      subtotalAmount: input.subtotalAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.totalAmount,
      type: input.channel,
    })
    .returning();

  const invoice = invoiceRows[0];
  if (!invoice) throw new Error("Failed to insert invoice.");

  const lineRecords: InvoiceLineItemRecord[] = [];

  for (const [index, line] of input.lineItems.entries()) {
    const lineItemRows = await tx
      .insert(invoiceLineItems)
      .values({
        invoiceId: invoice.id,
        lineTotal: line.lineTotal,
        quantity: line.quantity,
        skuId: line.skuId,
        skuSnapshot: line.skuSnapshot,
        stockMovementId: options.stockMovementIds?.[index] ?? null,
        taxAmount: line.taxAmount,
        taxCategory: line.taxCategory,
        taxRate: line.taxRate,
        unitPrice: line.unitPrice,
      })
      .returning();

    const lineItem = lineItemRows[0];
    if (!lineItem) throw new Error("Failed to insert invoice line item.");

    lineRecords.push(mapLineItem(lineItem));
  }

  return {
    ...mapInvoice(invoice),
    customerContactReference: input.customerContactReference ?? null,
    customerReference: input.customerReference ?? null,
    customerSlug: input.customerSlug ?? null,
    lines: lineRecords,
  };
}
