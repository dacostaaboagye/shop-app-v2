import type { Pool, PoolClient } from "pg";
import { PostgresStockAvailabilityRepository } from "./postgres-availability-query.repository.js";
import type {
  StockReservationLifecycleRepository,
  StockReservationRecord,
  StockReservationTransaction,
} from "./reservation-lifecycle.contracts.js";
import {
  requireStockReservation,
  STOCK_RESERVATION_RECORD_COLUMNS,
} from "./stock-reservation-record.sql.js";

type PgTransactionPool = Pick<Pool, "connect">;

export class PostgresStockReservationLifecycleRepository
  implements StockReservationLifecycleRepository
{
  constructor(private readonly pool: PgTransactionPool) {}

  async withTransaction<T>(
    callback: (transaction: StockReservationTransaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(
        new PostgresStockReservationTransaction(client),
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

class PostgresStockReservationTransaction
  implements StockReservationTransaction
{
  private readonly availabilityRepository: PostgresStockAvailabilityRepository;

  constructor(private readonly client: PoolClient) {
    this.availabilityRepository = new PostgresStockAvailabilityRepository(
      client,
    );
  }

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

  async findActiveReservationBySource(input: {
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockReservationRecord | null> {
    const result = await this.client.query<StockReservationRecord>(
      `
        SELECT
          ${STOCK_RESERVATION_RECORD_COLUMNS}
        FROM stock_reservations
        WHERE sku_id = $1
          AND location_id = $2
          AND source_type = $3
          AND source_key = $4
          AND status = 'active'
        LIMIT 1
      `,
      [input.skuId, input.locationId, input.sourceType, input.sourceKey],
    );

    return result.rows[0] ?? null;
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

  async getStockAvailabilitySnapshot(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }): Promise<{
    activeReservationQuantity: number;
    onHandQuantity: number;
    reservedQuantity: number;
  } | null> {
    return this.availabilityRepository.getStockAvailabilitySnapshot(input);
  }

  async insertReservation(input: {
    createdAt: Date;
    createdBy?: string | null;
    expiresAt: Date | null;
    locationId: string;
    quantity: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockReservationRecord> {
    const result = await this.client.query<StockReservationRecord>(
      `
        INSERT INTO stock_reservations (
          sku_id,
          location_id,
          quantity,
          status,
          source_type,
          source_key,
          expires_at,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $8)
        RETURNING
          ${STOCK_RESERVATION_RECORD_COLUMNS}
      `,
      [
        input.skuId,
        input.locationId,
        input.quantity,
        input.sourceType,
        input.sourceKey,
        input.expiresAt,
        input.createdBy ?? null,
        input.createdAt,
      ],
    );

    return requireStockReservation(
      result.rows[0],
      "Failed to insert a stock reservation.",
    );
  }

  async markReservationConfirmed(input: {
    confirmedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const result = await this.client.query<StockReservationRecord>(
      `
        UPDATE stock_reservations
        SET
          status = 'confirmed',
          confirmed_at = $2,
          updated_at = $2
        WHERE id = $1
        RETURNING
          ${STOCK_RESERVATION_RECORD_COLUMNS}
      `,
      [input.reservationId, input.confirmedAt],
    );

    return requireStockReservation(
      result.rows[0],
      "Failed to confirm the stock reservation.",
    );
  }

  async markReservationReleased(input: {
    releasedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const result = await this.client.query<StockReservationRecord>(
      `
        UPDATE stock_reservations
        SET
          status = 'released',
          released_at = $2,
          updated_at = $2
        WHERE id = $1
        RETURNING
          ${STOCK_RESERVATION_RECORD_COLUMNS}
      `,
      [input.reservationId, input.releasedAt],
    );

    return requireStockReservation(
      result.rows[0],
      "Failed to release the stock reservation.",
    );
  }
}
