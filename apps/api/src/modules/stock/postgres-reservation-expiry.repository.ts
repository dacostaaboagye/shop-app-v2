import type { Pool, PoolClient } from "pg";
import type {
  StockReservationExpiryRepository,
  StockReservationExpiryTransaction,
} from "./reservation-expiry.contracts.js";
import type { StockReservationRecord } from "./reservation-lifecycle.contracts.js";
import {
  requireStockReservation,
  STOCK_RESERVATION_RECORD_COLUMNS,
} from "./stock-reservation-record.sql.js";

type PgPool = Pick<Pool, "connect" | "query">;

export class PostgresReservationExpiryRepository
  implements StockReservationExpiryRepository
{
  constructor(private readonly pool: PgPool) {}

  async findExpiredActiveReservationIds(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<string[]> {
    const result = await this.pool.query<{ id: string }>(
      `
        SELECT id
        FROM stock_reservations
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at <= $1
        ORDER BY expires_at ASC, created_at ASC
        LIMIT $2
      `,
      [input.expiredBefore, input.limit ?? 100],
    );

    return result.rows.map((row) => row.id);
  }

  async withTransaction<T>(
    callback: (transaction: StockReservationExpiryTransaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(
        new PostgresReservationExpiryTransaction(client),
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

class PostgresReservationExpiryTransaction
  implements StockReservationExpiryTransaction
{
  constructor(private readonly client: PoolClient) {}

  async adjustStockBalance(input: {
    locationId: string;
    onHandDelta?: number;
    reservedDelta?: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<boolean> {
    const result = await this.client.query<{ id: string }>(
      `
        UPDATE stock_balances
        SET
          on_hand_quantity = on_hand_quantity + $3,
          reserved_quantity = reserved_quantity + $4,
          updated_at = $5,
          updated_by = $6
        WHERE sku_id = $1
          AND location_id = $2
        RETURNING id
      `,
      [
        input.skuId,
        input.locationId,
        input.onHandDelta ?? 0,
        input.reservedDelta ?? 0,
        input.updatedAt,
        input.updatedBy ?? null,
      ],
    );

    return result.rowCount === 1;
  }

  async getReservationForUpdate(
    reservationId: string,
  ): Promise<StockReservationRecord | null> {
    const result = await this.client.query<StockReservationRecord>(
      `
        SELECT
          ${STOCK_RESERVATION_RECORD_COLUMNS}
        FROM stock_reservations
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [reservationId],
    );

    return result.rows[0] ?? null;
  }

  async markReservationExpired(input: {
    expiredAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const result = await this.client.query<StockReservationRecord>(
      `
        UPDATE stock_reservations
        SET
          status = 'expired',
          updated_at = $2
        WHERE id = $1
        RETURNING
          ${STOCK_RESERVATION_RECORD_COLUMNS}
      `,
      [input.reservationId, input.expiredAt],
    );

    return requireStockReservation(
      result.rows[0],
      "Failed to expire the stock reservation.",
    );
  }
}
