import { stockBalances } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  StockBalanceAdjustmentRepository,
  StockBalanceAdjustmentTransaction,
  StockBalanceRecord,
} from "./stock-balance-adjustment.contracts.js";

export class PostgresStockBalanceAdjustmentRepository
  implements StockBalanceAdjustmentRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async withTransaction<T>(
    callback: (transaction: StockBalanceAdjustmentTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const transaction = new PostgresStockBalanceAdjustmentTransaction(tx);
      return callback(transaction);
    });
  }
}

class PostgresStockBalanceAdjustmentTransaction
  implements StockBalanceAdjustmentTransaction
{
  constructor(private readonly tx: ApiDatabase) {}

  async getBalanceForUpdate(input: {
    locationId: string;
    skuId: string;
  }): Promise<StockBalanceRecord | null> {
    const [row] = await this.tx
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.skuId, input.skuId),
          eq(stockBalances.locationId, input.locationId),
        ),
      )
      .for("update");

    return row ?? null;
  }

  async insertBalance(input: {
    createdAt: Date;
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord> {
    const [row] = await this.tx
      .insert(stockBalances)
      .values({
        skuId: input.skuId,
        locationId: input.locationId,
        onHandQuantity: input.onHandQuantity,
        reservedQuantity: 0,
        updatedBy: input.updatedBy ?? null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert the stock balance row.");
    }

    return row;
  }

  async updateOnHandQuantity(input: {
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord> {
    const [row] = await this.tx
      .update(stockBalances)
      .set({
        onHandQuantity: input.onHandQuantity,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy ?? null,
      })
      .where(
        and(
          eq(stockBalances.skuId, input.skuId),
          eq(stockBalances.locationId, input.locationId),
        ),
      )
      .returning();

    if (!row) {
      throw new Error("Failed to update the stock balance row.");
    }

    return row;
  }
}
