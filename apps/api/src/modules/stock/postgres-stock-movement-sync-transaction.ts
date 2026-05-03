import { stockBalances, stockMovements } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { StockBalanceRecord } from "./stock-balance-adjustment.contracts.js";
import type {
  StockMovementRecord,
  StockMovementSyncTransaction,
  StockMovementType,
} from "./stock-movement-sync.contracts.js";

export function createPostgresStockMovementSyncTransaction(
  tx: ApiDatabase,
): StockMovementSyncTransaction {
  return new PostgresStockMovementSyncTransaction(tx);
}

class PostgresStockMovementSyncTransaction
  implements StockMovementSyncTransaction
{
  constructor(private readonly tx: ApiDatabase) {}

  async findMovementBySource(input: {
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockMovementRecord | null> {
    const [row] = await this.tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.skuId, input.skuId),
          eq(stockMovements.locationId, input.locationId),
          eq(stockMovements.sourceType, input.sourceType),
          eq(stockMovements.sourceKey, input.sourceKey),
        ),
      )
      .limit(1);
    return row ?? null;
  }

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
        createdAt: input.createdAt,
        locationId: input.locationId,
        onHandQuantity: input.onHandQuantity,
        reservedQuantity: 0,
        skuId: input.skuId,
        updatedAt: input.createdAt,
        updatedBy: input.updatedBy ?? null,
      })
      .returning();
    if (!row) throw new Error("Failed to insert the stock balance row.");
    return row;
  }

  async insertMovement(input: {
    createdAt: Date;
    createdBy?: string | null;
    locationId: string;
    movementType: StockMovementType;
    occurredAt: Date;
    quantityDelta: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockMovementRecord> {
    const [row] = await this.tx
      .insert(stockMovements)
      .values({
        createdAt: input.createdAt,
        createdBy: input.createdBy ?? null,
        locationId: input.locationId,
        movementType: input.movementType,
        occurredAt: input.occurredAt,
        quantityDelta: input.quantityDelta,
        skuId: input.skuId,
        sourceKey: input.sourceKey,
        sourceType: input.sourceType,
      })
      .returning();
    if (!row) throw new Error("Failed to insert the stock movement row.");
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
    if (!row) throw new Error("Failed to update the stock balance row.");
    return row;
  }
}
