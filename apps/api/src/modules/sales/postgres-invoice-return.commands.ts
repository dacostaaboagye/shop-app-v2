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
        classification: invoices.classification,
        customerBillingAddressLines: invoices.customerBillingAddressLines,
        customerContactId: invoices.customerContactId,
        customerEmail: invoices.customerEmail,
        customerId: invoices.customerId,
        customerName: invoices.customerName,
        customerPhone: invoices.customerPhone,
        customerTaxNumber: invoices.customerTaxNumber,
        currencyCode: invoices.currencyCode,
        currencyScale: invoices.currencyScale,
        notes: invoices.notes,
        paymentMethod: invoices.paymentMethod,
        reference: invoices.reference,
        revisionRootInvoiceId: invoices.revisionRootInvoiceId,
      })
      .from(invoices)
      .where(eq(invoices.id, input.parentInvoiceId));

    const revisionRootInvoiceId =
      parentInvoice?.revisionRootInvoiceId ?? input.revisionRootInvoiceId;

    const revisionRootReference =
      revisionRootInvoiceId === input.parentInvoiceId
        ? (parentInvoice?.reference ?? null)
        : await resolveInvoiceReference(tx, revisionRootInvoiceId);

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
        classification: parentInvoice?.classification ?? input.classification,
        confirmedAt: input.confirmedAt,
        createdBy: input.createdBy,
        customerBillingAddressLines:
          parentInvoice?.customerBillingAddressLines ?? null,
        customerContactId:
          parentInvoice?.customerContactId ?? input.customerContactId ?? null,
        currencyCode: parentInvoice?.currencyCode ?? input.currencyCode,
        currencyScale: parentInvoice?.currencyScale ?? input.currencyScale,
        customerEmail: parentInvoice?.customerEmail ?? null,
        customerId: parentInvoice?.customerId ?? input.customerId ?? null,
        customerName: parentInvoice?.customerName ?? null,
        customerPhone: parentInvoice?.customerPhone ?? null,
        customerTaxNumber: parentInvoice?.customerTaxNumber ?? null,
        locationId: input.locationId,
        notes: input.voidReason,
        parentInvoiceId: input.parentInvoiceId,
        revisionRootInvoiceId,
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
    let replacementInvoiceReference: string | null = null;

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

    if (input.adjustedInvoice) {
      const adjustedInvoiceRows = await tx
        .insert(invoices)
        .values({
          attributedWorkerId: input.attributedWorkerId,
          classification: parentInvoice?.classification ?? input.classification,
          confirmedAt: input.confirmedAt,
          createdBy: input.createdBy,
          customerBillingAddressLines:
            parentInvoice?.customerBillingAddressLines ?? null,
          customerContactId:
            parentInvoice?.customerContactId ?? input.customerContactId ?? null,
          currencyCode: parentInvoice?.currencyCode ?? input.currencyCode,
          currencyScale: parentInvoice?.currencyScale ?? input.currencyScale,
          customerEmail: parentInvoice?.customerEmail ?? null,
          customerId: parentInvoice?.customerId ?? input.customerId ?? null,
          customerName: parentInvoice?.customerName ?? null,
          customerPhone: parentInvoice?.customerPhone ?? null,
          customerTaxNumber: parentInvoice?.customerTaxNumber ?? null,
          locationId: input.locationId,
          notes: parentInvoice?.notes ?? null,
          parentInvoiceId: input.parentInvoiceId,
          paymentMethod: parentInvoice?.paymentMethod ?? null,
          reference: input.adjustedInvoice.reference,
          revisionCreditNoteId: creditNote.id,
          revisionRootInvoiceId,
          status: "confirmed",
          subtotalAmount: input.adjustedInvoice.subtotalAmount,
          taxAmount: input.adjustedInvoice.taxAmount,
          totalAmount: input.adjustedInvoice.totalAmount,
          type: "adjusted",
        })
        .returning();

      const adjustedInvoice = adjustedInvoiceRows[0];
      if (!adjustedInvoice)
        throw new Error("Failed to insert adjusted invoice.");

      replacementInvoiceReference = adjustedInvoice.reference;

      for (const line of input.adjustedInvoice.lines) {
        await tx.insert(invoiceLineItems).values({
          invoiceId: adjustedInvoice.id,
          lineTotal: line.lineTotal,
          quantity: line.quantity,
          skuId: line.skuId,
          skuSnapshot: line.skuSnapshot,
          stockMovementId: null,
          taxAmount: line.taxAmount,
          taxCategory: line.taxCategory,
          taxRate: line.taxRate,
          unitPrice: line.unitPrice,
        });
      }

      await tx
        .update(invoices)
        .set({
          replacementInvoiceId: adjustedInvoice.id,
          status: "superseded",
          updatedAt: input.now,
        })
        .where(eq(invoices.id, input.parentInvoiceId));

      await tx
        .update(invoices)
        .set({
          replacementInvoiceId: adjustedInvoice.id,
          updatedAt: input.now,
        })
        .where(eq(invoices.id, creditNote.id));
    } else {
      await tx
        .update(invoices)
        .set({
          status: "superseded",
          updatedAt: input.now,
        })
        .where(eq(invoices.id, input.parentInvoiceId));
    }

    return {
      ...mapInvoice(creditNote),
      lines: lineRecords,
      parentInvoiceReference: parentInvoice?.reference ?? null,
      replacementInvoiceReference,
      revisionRootReference,
    };
  });
}

async function resolveInvoiceReference(
  tx: ApiDatabase,
  invoiceId: string,
): Promise<string | null> {
  const [invoice] = await tx
    .select({ reference: invoices.reference })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  return invoice?.reference ?? null;
}
