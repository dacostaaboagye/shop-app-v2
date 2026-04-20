import {
  invoiceLineItems,
  invoices,
  stockBalances,
  stockMovements,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { mapInvoice, mapLineItem } from "./postgres-invoice.mappers.js";
import {
  type CreateSaleTransactionInput,
  InsufficientStockForSaleError,
  type InvoiceLineItemRecord,
  type InvoiceWithLines,
} from "./sales.contracts.js";

export class PostgresInvoiceRepository {
  constructor(private readonly db: ApiDatabase) {}

  async createSaleTransaction(
    input: CreateSaleTransactionInput,
  ): Promise<InvoiceWithLines> {
    return this.db.transaction(async (tx) => {
      for (const line of input.lineItems) {
        const [balance] = await tx
          .select({
            onHandQuantity: stockBalances.onHandQuantity,
            reservedQuantity: stockBalances.reservedQuantity,
          })
          .from(stockBalances)
          .where(
            and(
              eq(stockBalances.skuId, line.skuId),
              eq(stockBalances.locationId, input.locationId),
            ),
          )
          .for("update");

        const available = balance
          ? balance.onHandQuantity - balance.reservedQuantity
          : 0;

        if (available < line.quantity) {
          throw new InsufficientStockForSaleError({
            availableQuantity: available,
            locationId: input.locationId,
            requestedQuantity: line.quantity,
            skuId: line.skuId,
          });
        }

        await tx
          .update(stockBalances)
          .set({
            onHandQuantity: sql`${stockBalances.onHandQuantity} - ${line.quantity}`,
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

      const invoiceRows = await tx
        .insert(invoices)
        .values({
          attributedWorkerId: input.attributedWorkerId,
          confirmedAt: input.confirmedAt,
          createdBy: input.createdBy,
          locationId: input.locationId,
          notes: input.notes,
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          status: "confirmed",
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          type: "pos",
        })
        .returning();

      const invoice = invoiceRows[0];
      if (!invoice) throw new Error("Failed to insert invoice.");

      const movementSourceType = "pos_sale";
      const lineRecords: InvoiceLineItemRecord[] = [];

      for (const line of input.lineItems) {
        const sourceKey = `${input.reference}:${line.skuId}`;

        const movementRows = await tx
          .insert(stockMovements)
          .values({
            createdBy: input.createdBy,
            locationId: input.locationId,
            movementType: "sale",
            occurredAt: input.confirmedAt,
            quantityDelta: -line.quantity,
            skuId: line.skuId,
            sourceKey,
            sourceType: movementSourceType,
          })
          .returning({ id: stockMovements.id });

        const movement = movementRows[0];
        if (!movement) throw new Error("Failed to insert stock movement.");

        const lineItemRows = await tx
          .insert(invoiceLineItems)
          .values({
            invoiceId: invoice.id,
            lineTotal: line.lineTotal,
            quantity: line.quantity,
            skuId: line.skuId,
            skuSnapshot: line.skuSnapshot,
            stockMovementId: movement.id,
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

      return { ...mapInvoice(invoice), lines: lineRecords };
    });
  }

  async createReturnTransaction(input: {
    attributedWorkerId: string | null;
    confirmedAt: Date;
    createdBy: string;
    lines: {
      lineTotal: string;
      quantity: number;
      skuId: string;
      skuSnapshot: { sku: string; variantName: string; productName: string };
      taxAmount: string;
      taxCategory: string | null;
      taxRate: string | null;
      unitPrice: string;
    }[];
    locationId: string;
    now: Date;
    parentInvoiceId: string;
    reference: string;
    subtotalAmount: string;
    taxAmount: string;
    totalAmount: string;
    voidReason: string;
  }): Promise<InvoiceWithLines> {
    return this.db.transaction(async (tx) => {
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
}
