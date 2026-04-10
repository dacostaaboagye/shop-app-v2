import type { Pool, PoolClient } from "pg";
import type {
  StockBalanceAdjustmentRepository,
  StockBalanceAdjustmentTransaction,
  StockBalanceRecord,
} from "./stock-balance-adjustment.contracts.js";
import {
  requireStockBalance,
  STOCK_BALANCE_RECORD_COLUMNS,
} from "./stock-balance-record.sql.js";

type PgTransactionPool = Pick<Pool, "connect">;

export class PostgresStockBalanceAdjustmentRepository
  implements StockBalanceAdjustmentRepository
{
  constructor(private readonly pool: PgTransactionPool) {}

  async withTransaction<T>(
    callback: (transaction: StockBalanceAdjustmentTransaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(
        new PostgresStockBalanceAdjustmentTransaction(client),
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

class PostgresStockBalanceAdjustmentTransaction
  implements StockBalanceAdjustmentTransaction
{
  constructor(private readonly client: PoolClient) {}

  async getBalanceForUpdate(input: {
    locationId: string;
    skuId: string;
  }): Promise<StockBalanceRecord | null> {
    const result = await this.client.query<StockBalanceRecord>(
      `
        SELECT
          ${STOCK_BALANCE_RECORD_COLUMNS}
        FROM stock_balances
        WHERE sku_id = $1
          AND location_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [input.skuId, input.locationId],
    );

    return result.rows[0] ?? null;
  }

  async insertBalance(input: {
    createdAt: Date;
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord> {
    const result = await this.client.query<StockBalanceRecord>(
      `
        INSERT INTO stock_balances (
          sku_id,
          location_id,
          on_hand_quantity,
          reserved_quantity,
          updated_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 0, $4, $5, $5)
        RETURNING
          ${STOCK_BALANCE_RECORD_COLUMNS}
      `,
      [
        input.skuId,
        input.locationId,
        input.onHandQuantity,
        input.updatedBy ?? null,
        input.createdAt,
      ],
    );

    return requireStockBalance(
      result.rows[0],
      "Failed to insert the stock balance row.",
    );
  }

  async updateOnHandQuantity(input: {
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord> {
    const result = await this.client.query<StockBalanceRecord>(
      `
        UPDATE stock_balances
        SET
          on_hand_quantity = $3,
          updated_at = $4,
          updated_by = $5
        WHERE sku_id = $1
          AND location_id = $2
        RETURNING
          ${STOCK_BALANCE_RECORD_COLUMNS}
      `,
      [
        input.skuId,
        input.locationId,
        input.onHandQuantity,
        input.updatedAt,
        input.updatedBy ?? null,
      ],
    );

    return requireStockBalance(
      result.rows[0],
      "Failed to update the stock balance row.",
    );
  }
}
