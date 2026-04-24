import { stockBalances, stockReservations } from "@shop/database";
import { and, eq, ne, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  StockAvailabilityRepository,
  StockAvailabilitySnapshot,
} from "./availability-query.service.js";

export class PostgresStockAvailabilityRepository
  implements StockAvailabilityRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getStockAvailabilitySnapshot(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }): Promise<StockAvailabilitySnapshot | null> {
    const reservationSubquery = this.db
      .select({
        skuId: stockReservations.skuId,
        locationId: stockReservations.locationId,
        activeReservationQuantity:
          sql<number>`cast(sum(${stockReservations.quantity}) as int)`.as(
            "active_reservation_quantity",
          ),
      })
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.status, "active"),
          input.excludeReservationId
            ? ne(stockReservations.id, input.excludeReservationId)
            : undefined,
        ),
      )
      .groupBy(stockReservations.skuId, stockReservations.locationId)
      .as("reservations");

    const query = this.db
      .select({
        onHandQuantity: stockBalances.onHandQuantity,
        reservedQuantity: stockBalances.reservedQuantity,
        activeReservationQuantity: sql<number>`coalesce(${reservationSubquery.activeReservationQuantity}, 0)`,
      })
      .from(stockBalances)
      .leftJoin(
        reservationSubquery,
        and(
          eq(reservationSubquery.skuId, stockBalances.skuId),
          eq(reservationSubquery.locationId, stockBalances.locationId),
        ),
      )
      .where(
        and(
          eq(stockBalances.skuId, input.skuId),
          eq(stockBalances.locationId, input.locationId),
        ),
      );

    if (input.lock === "for_update") {
      query.for("update", { of: stockBalances });
    }

    const [row] = await query;

    return row ?? null;
  }
}
