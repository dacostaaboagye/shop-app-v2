import type { Pool } from "pg";
import type {
  StockAvailabilityRepository,
  StockAvailabilitySnapshot,
} from "./availability-query.service.js";

export type PgQueryable = Pick<Pool, "query">;

export class PostgresStockAvailabilityRepository
  implements StockAvailabilityRepository
{
  constructor(private readonly queryable: PgQueryable) {}

  async getStockAvailabilitySnapshot(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }): Promise<StockAvailabilitySnapshot | null> {
    const shouldExcludeReservation = input.excludeReservationId != null;
    const shouldLockBalance = input.lock === "for_update";
    const result = await this.queryable.query<StockAvailabilitySnapshot>(
      `
        SELECT
          balance.on_hand_quantity AS "onHandQuantity",
          balance.reserved_quantity AS "reservedQuantity",
          COALESCE(reservations.active_reservation_quantity, 0) AS "activeReservationQuantity"
        FROM stock_balances AS balance
        LEFT JOIN (
          SELECT
            sku_id,
            location_id,
            SUM(quantity)::int AS active_reservation_quantity
          FROM stock_reservations
          WHERE status = 'active'
            AND ($3::boolean = false OR id <> $4::uuid)
          GROUP BY sku_id, location_id
        ) AS reservations
          ON reservations.sku_id = balance.sku_id
         AND reservations.location_id = balance.location_id
        WHERE balance.sku_id = $1
          AND balance.location_id = $2
        ${shouldLockBalance ? "FOR UPDATE OF balance" : ""}
      `,
      [
        input.skuId,
        input.locationId,
        shouldExcludeReservation,
        input.excludeReservationId ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }
}
