import { stockBalances, stockMovements } from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CreateIssuedInvoiceTransactionInput } from "./invoice-issuance.contracts.js";
import { createReturnTransaction } from "./postgres-invoice-return.commands.js";
import { insertIssuedInvoice } from "./postgres-issued-invoice.commands.js";
import {
  type CreateReturnTransactionInput,
  type CreateSaleTransactionInput,
  InsufficientStockForSaleError,
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

      const movementSourceType = "pos_sale";
      const stockMovementIds: string[] = [];

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

        stockMovementIds.push(movement.id);
      }

      return insertIssuedInvoice(
        tx,
        {
          ...input,
          channel: "pos",
          paymentMethod: input.paymentMethod,
        },
        { stockMovementIds },
      );
    });
  }

  async createIssuedInvoiceTransaction(
    input: CreateIssuedInvoiceTransactionInput,
  ): Promise<InvoiceWithLines> {
    return this.db.transaction((tx) => insertIssuedInvoice(tx, input));
  }

  async createReturnTransaction(
    input: CreateReturnTransactionInput,
  ): Promise<InvoiceWithLines> {
    return createReturnTransaction(this.db, input);
  }
}
