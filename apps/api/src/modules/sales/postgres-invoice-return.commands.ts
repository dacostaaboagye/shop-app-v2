import {
  invoiceLineItems,
  invoices,
  stockBalances,
  stockMovements,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { mapInvoice, mapLineItem } from "./postgres-invoice.mappers.js";
import type {
  CreateReturnTransactionInput,
  InvoiceLineItemRecord,
  InvoiceWithLines,
} from "./sales.contracts.js";

export async function createReturnTransaction(
  db: ApiDatabase,
  input: CreateReturnTransactionInput,
): Promise<InvoiceWithLines> {
  return db.transaction(async (tx) => {
    const [parentInvoice] = await tx
      .select({
        customerBillingAddressLines: invoices.customerBillingAddressLines,
        customerEmail: invoices.customerEmail,
        customerName: invoices.customerName,
        customerPhone: invoices.customerPhone,
        customerTaxNumber: invoices.customerTaxNumber,
      })
      .from(invoices)
      .where(eq(invoices.id, input.parentInvoiceId));

    for (const line of input.lines) {
      await tx
        .update(stockBalances)
        .set({
          onHandQuantity: sql`${stockBalances.onHandQuantity} + ${line.quantity}`,
          updatedAt: input.now,
          updatedBy: input.createdBy,
        })
        .where(
          and(
            eq(stockBalances.skuId, line.skuId),
            eq(stockBalances.locationId, input.locationId),
          ),
        );
    }

    const creditNoteRows = await tx
      .insert(invoices)
      .values({
        attributedWorkerId: input.attributedWorkerId,
        confirmedAt: input.confirmedAt,
        createdBy: input.createdBy,
        customerBillingAddressLines:
          parentInvoice?.customerBillingAddressLines ?? null,
        customerEmail: parentInvoice?.customerEmail ?? null,
        customerName: parentInvoice?.customerName ?? null,
        customerPhone: parentInvoice?.customerPhone ?? null,
        customerTaxNumber: parentInvoice?.customerTaxNumber ?? null,
        locationId: input.locationId,
        notes: input.voidReason,
        parentInvoiceId: input.parentInvoiceId,
        reference: input.reference,
        status: "confirmed",
        subtotalAmount: input.subtotalAmount,
        taxAmount: input.taxAmount,
        totalAmount: input.totalAmount,
        type: "credit_note",
      })
      .returning();

    const creditNote = creditNoteRows[0];
    if (!creditNote) throw new Error("Failed to insert credit note.");

    const lineRecords: InvoiceLineItemRecord[] = [];

    for (const line of input.lines) {
      const sourceKey = `${input.reference}:${line.skuId}`;

      const movementRows = await tx
        .insert(stockMovements)
        .values({
          createdBy: input.createdBy,
          locationId: input.locationId,
          movementType: "manual_adjustment",
          occurredAt: input.confirmedAt,
          quantityDelta: line.quantity,
          skuId: line.skuId,
          sourceKey,
          sourceType: "pos_return",
        })
        .returning({ id: stockMovements.id });

      const movement = movementRows[0];
      if (!movement) throw new Error("Failed to insert stock movement.");

      const lineItemRows = await tx
        .insert(invoiceLineItems)
        .values({
          invoiceId: creditNote.id,
          lineTotal: `-${line.lineTotal}`,
          quantity: line.quantity,
          skuId: line.skuId,
          skuSnapshot: line.skuSnapshot,
          stockMovementId: movement.id,
          taxAmount: `-${line.taxAmount}`,
          taxCategory: line.taxCategory,
          taxRate: line.taxRate,
          unitPrice: line.unitPrice,
        })
        .returning();

      const lineItem = lineItemRows[0];
      if (!lineItem) throw new Error("Failed to insert invoice line item.");

      lineRecords.push(mapLineItem(lineItem));
    }

    return { ...mapInvoice(creditNote), lines: lineRecords };
  });
}
