import type { Pool } from "pg";
import type {
  ActiveReservationQueryRepository,
  ActiveReservationSummary,
} from "./active-reservation-query.service.js";

export class PostgresActiveReservationQueryRepository
  implements ActiveReservationQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async listActiveReservations(input: {
    expiresAfter?: Date;
    expiresBefore?: Date;
    limit: number;
    locationId: string;
    skuId?: string;
    sourceType?: string;
  }): Promise<ActiveReservationSummary[]> {
    const result = await this.pool.query<ActiveReservationSummary>(
      `
        SELECT
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          location_id AS "locationId",
          quantity,
          sku_id AS "skuId",
          source_key AS "sourceKey",
          source_type AS "sourceType",
          status,
          updated_at AS "updatedAt"
        FROM stock_reservations
        WHERE status = 'active'
          AND location_id = $1
          AND ($2::boolean = false OR sku_id = $3)
          AND ($4::boolean = false OR source_type = $5)
          AND ($6::boolean = false OR expires_at <= $7)
          AND ($8::boolean = false OR expires_at >= $9)
        ORDER BY expires_at ASC NULLS LAST, created_at ASC
        LIMIT $10
      `,
      [
        input.locationId,
        input.skuId != null,
        input.skuId ?? null,
        input.sourceType != null,
        input.sourceType ?? null,
        input.expiresBefore != null,
        input.expiresBefore ?? null,
        input.expiresAfter != null,
        input.expiresAfter ?? null,
        input.limit,
      ],
    );

    return result.rows;
  }
}
