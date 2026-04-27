import {
  invoiceLineItems,
  invoices,
  stockBalances,
  stockMovements,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { mapInvoice, mapLineItem } from "./postgres-invoice.mappers.js";
import { createReturnTransaction } from "./postgres-invoice-return.commands.js";
import {
  type CreateReturnTransactionInput,
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
          customerBillingAddressLines:
            input.customerBillingAddressLines ?? null,
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          customerEmail: input.customerEmail ?? null,
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

  async createReturnTransaction(
    input: CreateReturnTransactionInput,
  ): Promise<InvoiceWithLines> {
    return createReturnTransaction(this.db, input);
  }
}
