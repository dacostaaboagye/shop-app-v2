import type { Pool } from "pg";
import type {
  OwnershipEventRecord,
  OwnershipQueryRepository,
} from "./ownership-query.service.js";

export class PostgresOwnershipQueryRepository
  implements OwnershipQueryRepository
{
  constructor(private readonly pool: Pool) {}

  async getLatestEventAtOrBefore(input: {
    locationId: string;
    skuId: string;
    timestamp: Date;
  }): Promise<OwnershipEventRecord | null> {
    const result = await this.pool.query<OwnershipEventRecord>(
      `
        SELECT
          id,
          created_at AS "createdAt",
          effective_from AS "effectiveFrom",
          event_type AS "eventType",
          handover_chain_id AS "handoverChainId",
          location_id AS "locationId",
          sku_id AS "skuId",
          quantity,
          worker_id AS "workerId"
        FROM stock_ownership_events
        WHERE sku_id = $1
          AND location_id = $2
          AND effective_from <= $3
        ORDER BY effective_from DESC, created_at DESC
        LIMIT 1
      `,
      [input.skuId, input.locationId, input.timestamp],
    );

    return result.rows[0] ?? null;
  }

  async getOwnershipHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<OwnershipEventRecord[]> {
    const result = await this.pool.query<OwnershipEventRecord>(
      `
        SELECT
          id,
          created_at AS "createdAt",
          effective_from AS "effectiveFrom",
          event_type AS "eventType",
          handover_chain_id AS "handoverChainId",
          location_id AS "locationId",
          sku_id AS "skuId",
          quantity,
          worker_id AS "workerId"
        FROM stock_ownership_events
        WHERE sku_id = $1 AND location_id = $2
        ORDER BY effective_from ASC, created_at ASC
      `,
      [input.skuId, input.locationId],
    );

    return result.rows;
  }
}
