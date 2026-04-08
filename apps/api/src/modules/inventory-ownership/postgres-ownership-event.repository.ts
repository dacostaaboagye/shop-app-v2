import type { Pool } from "pg";
import {
  OWNERSHIP_EVENT_RECORD_COLUMNS,
  requireOwnershipEvent,
} from "./ownership-event-record.sql.js";
import type { OwnershipEventWriteRepository } from "./ownership-event-write.service.js";
import type { OwnershipEventRecord } from "./ownership-query.service.js";

export class PostgresOwnershipEventRepository
  implements OwnershipEventWriteRepository
{
  constructor(private readonly pool: Pool) {}

  async insertOwnershipEvent(input: {
    createdBy: string;
    effectiveFrom: Date;
    eventType: "assigned" | "reassigned";
    handoverChainId: string | null;
    locationId: string;
    skuId: string;
    quantity: number;
    workerId: string;
  }): Promise<OwnershipEventRecord> {
    const result = await this.pool.query<OwnershipEventRecord>(
      `
        INSERT INTO stock_ownership_events (
          sku_id,
          location_id,
          worker_id,
          event_type,
          quantity,
          effective_from,
          handover_chain_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          ${OWNERSHIP_EVENT_RECORD_COLUMNS}
      `,
      [
        input.skuId,
        input.locationId,
        input.workerId,
        input.eventType,
        input.quantity,
        input.effectiveFrom,
        input.handoverChainId,
        input.createdBy,
      ],
    );

    return requireOwnershipEvent(
      result.rows[0],
      "Failed to insert an ownership event.",
    );
  }
}
