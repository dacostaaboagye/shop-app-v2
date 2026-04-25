import { stockBalances, stockReservations } from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { PostgresStockAvailabilityRepository } from "./postgres-availability-query.repository.js";
import type {
  StockReservationLifecycleRepository,
  StockReservationRecord,
  StockReservationTransaction,
} from "./reservation-lifecycle.contracts.js";

export class PostgresStockReservationLifecycleRepository
  implements StockReservationLifecycleRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async withTransaction<T>(
    callback: (transaction: StockReservationTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const transaction = createPostgresStockReservationTransaction(tx);
      return callback(transaction);
    });
  }
}

export function createPostgresStockReservationTransaction(tx: ApiDatabase) {
  return new PostgresStockReservationTransaction(tx);
}

class PostgresStockReservationTransaction
  implements StockReservationTransaction
{
  private readonly availabilityRepository: PostgresStockAvailabilityRepository;

  constructor(private readonly tx: ApiDatabase) {
    this.availabilityRepository = new PostgresStockAvailabilityRepository(tx);
  }

  async adjustStockBalance(input: {
    locationId: string;
    onHandDelta?: number;
    reservedDelta?: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<boolean> {
    const result = await this.tx
      .update(stockBalances)
      .set({
        onHandQuantity: sql`${stockBalances.onHandQuantity} + ${input.onHandDelta ?? 0}`,
        reservedQuantity: sql`${stockBalances.reservedQuantity} + ${input.reservedDelta ?? 0}`,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy ?? null,
      })
      .where(
        and(
          eq(stockBalances.skuId, input.skuId),
          eq(stockBalances.locationId, input.locationId),
        ),
      )
      .returning({ id: stockBalances.id });

    return result.length === 1;
  }

  async findActiveReservationBySource(input: {
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockReservationRecord | null> {
    const [row] = await this.tx
      .select()
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.skuId, input.skuId),
          eq(stockReservations.locationId, input.locationId),
          eq(stockReservations.sourceType, input.sourceType),
          eq(stockReservations.sourceKey, input.sourceKey),
          eq(stockReservations.status, "active"),
        ),
      );

    return row ?? null;
  }

  async getReservationForUpdate(
    reservationId: string,
  ): Promise<StockReservationRecord | null> {
    const [row] = await this.tx
      .select()
      .from(stockReservations)
      .where(eq(stockReservations.id, reservationId))
      .for("update");

    return row ?? null;
  }

  async getStockAvailabilitySnapshot(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }) {
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
    const [row] = await this.tx
      .insert(stockReservations)
      .values({
        skuId: input.skuId,
        locationId: input.locationId,
        quantity: input.quantity,
        status: "active",
        sourceType: input.sourceType,
        sourceKey: input.sourceKey,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy ?? null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert a stock reservation.");
    }

    return row;
  }

  async markReservationConfirmed(input: {
    confirmedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const [row] = await this.tx
      .update(stockReservations)
      .set({
        status: "confirmed",
        confirmedAt: input.confirmedAt,
        updatedAt: input.confirmedAt,
      })
      .where(eq(stockReservations.id, input.reservationId))
      .returning();

    if (!row) {
      throw new Error("Failed to confirm the stock reservation.");
    }

    return row;
  }

  async markReservationReleased(input: {
    releasedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord> {
    const [row] = await this.tx
      .update(stockReservations)
      .set({
        status: "released",
        releasedAt: input.releasedAt,
        updatedAt: input.releasedAt,
      })
      .where(eq(stockReservations.id, input.reservationId))
      .returning();

    if (!row) {
      throw new Error("Failed to release the stock reservation.");
    }

    return row;
  }
}
