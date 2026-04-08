import type { Pool } from "pg";
import {
  OWNERSHIP_EVENT_RECORD_COLUMNS,
  requireOwnershipEvent,
} from "./ownership-event-record.sql.js";
import type { OwnershipHandoverRepository } from "./ownership-handover.contracts.js";
import type { OwnershipEventRecord } from "./ownership-query.service.js";

export class PostgresOwnershipHandoverRepository
  implements OwnershipHandoverRepository
{
  constructor(private readonly pool: Pool) {}

  async findExpiredActiveHandoverChainIds(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<string[]> {
    const result = await this.pool.query<{ handoverChainId: string }>(
      `
        WITH latest_chain_events AS (
          SELECT DISTINCT ON (handover_chain_id)
            handover_chain_id AS "handoverChainId",
            event_type AS "eventType",
            effective_from AS "effectiveFrom"
          FROM stock_ownership_events
          WHERE handover_chain_id IS NOT NULL
          ORDER BY handover_chain_id, effective_from DESC, created_at DESC
        )
        SELECT "handoverChainId"
        FROM latest_chain_events
        WHERE "eventType" = 'handover_in'
          AND "effectiveFrom" <= $1
        ORDER BY "effectiveFrom" ASC
        LIMIT $2
      `,
      [input.expiredBefore, input.limit ?? 100],
    );

    return result.rows.map((row) => row.handoverChainId);
  }

  async getLatestChainEvent(
    handoverChainId: string,
  ): Promise<OwnershipEventRecord | null> {
    const result = await this.pool.query<OwnershipEventRecord>(
      `
        SELECT
          ${OWNERSHIP_EVENT_RECORD_COLUMNS}
        FROM stock_ownership_events
        WHERE handover_chain_id = $1
        ORDER BY effective_from DESC, created_at DESC
        LIMIT 1
      `,
      [handoverChainId],
    );

    return result.rows[0] ?? null;
  }

  async getOriginalWorkerForChain(
    handoverChainId: string,
  ): Promise<string | null> {
    const result = await this.pool.query<{ workerId: string }>(
      `
        SELECT worker_id AS "workerId"
        FROM stock_ownership_events
        WHERE handover_chain_id = $1
          AND event_type = 'handover_out'
        ORDER BY effective_from ASC, created_at ASC
        LIMIT 1
      `,
      [handoverChainId],
    );

    return result.rows[0]?.workerId ?? null;
  }

  async insertHandoverPair(input: {
    createdBy: string;
    effectiveFrom: Date;
    fromWorkerId: string;
    handoverChainId: string;
    locationId: string;
    skuId: string;
    quantity: number;
    toWorkerId: string;
  }): Promise<{
    handoverInEvent: OwnershipEventRecord;
    handoverOutEvent: OwnershipEventRecord;
  }> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const handoverOutResult = await client.query<OwnershipEventRecord>(
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
          VALUES ($1, $2, $3, 'handover_out', $4, $5, $6, $7)
          RETURNING
            ${OWNERSHIP_EVENT_RECORD_COLUMNS}
        `,
        [
          input.skuId,
          input.locationId,
          input.fromWorkerId,
          input.quantity,
          input.effectiveFrom,
          input.handoverChainId,
          input.createdBy,
        ],
      );
      const handoverInResult = await client.query<OwnershipEventRecord>(
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
          VALUES (
            $1, $2, $3, 'handover_in', $4,
            ($5::timestamptz + interval '1 microsecond'),
            $6, $7
          )
          RETURNING
            ${OWNERSHIP_EVENT_RECORD_COLUMNS}
        `,
        [
          input.skuId,
          input.locationId,
          input.toWorkerId,
          input.quantity,
          input.effectiveFrom,
          input.handoverChainId,
          input.createdBy,
        ],
      );

      await client.query("COMMIT");

      const handoverOutEvent = requireOwnershipEvent(
        handoverOutResult.rows[0],
        "Failed to insert handover events.",
      );
      const handoverInEvent = requireOwnershipEvent(
        handoverInResult.rows[0],
        "Failed to insert handover events.",
      );

      return {
        handoverInEvent,
        handoverOutEvent,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async insertRevertedEvent(input: {
    createdBy: string;
    effectiveFrom: Date;
    handoverChainId: string;
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
        VALUES ($1, $2, $3, 'reverted', $4, $5, $6, $7)
        RETURNING
          ${OWNERSHIP_EVENT_RECORD_COLUMNS}
      `,
      [
        input.skuId,
        input.locationId,
        input.workerId,
        input.quantity,
        input.effectiveFrom,
        input.handoverChainId,
        input.createdBy,
      ],
    );

    return requireOwnershipEvent(
      result.rows[0],
      "Failed to insert a reverted ownership event.",
    );
  }
}
