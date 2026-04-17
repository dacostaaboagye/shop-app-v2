import { stockOwnershipEvents } from "@shop/database";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { OwnershipHandoverRepository } from "./ownership-handover.contracts.js";
import type { OwnershipEventRecord } from "./ownership-query.service.js";

type ChainEventRow = {
  handoverChainId: string;
} & Record<string, unknown>;

export class PostgresOwnershipHandoverRepository
  implements OwnershipHandoverRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async findExpiredActiveHandoverChainIds(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<string[]> {
    const result = await this.db.execute<ChainEventRow>(sql`
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
        AND "effectiveFrom" <= ${input.expiredBefore}
      ORDER BY "effectiveFrom" ASC
      LIMIT ${input.limit ?? 100}
    `);

    return result.rows.map((row) => row.handoverChainId);
  }

  async getLatestChainEvent(
    handoverChainId: string,
  ): Promise<OwnershipEventRecord | null> {
    const [row] = await this.db
      .select()
      .from(stockOwnershipEvents)
      .where(eq(stockOwnershipEvents.handoverChainId, handoverChainId))
      .orderBy(
        desc(stockOwnershipEvents.effectiveFrom),
        desc(stockOwnershipEvents.createdAt),
      )
      .limit(1);

    return row ?? null;
  }

  async getOriginalWorkerForChain(
    handoverChainId: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ workerId: stockOwnershipEvents.workerId })
      .from(stockOwnershipEvents)
      .where(
        and(
          eq(stockOwnershipEvents.handoverChainId, handoverChainId),
          eq(stockOwnershipEvents.eventType, "handover_out"),
        ),
      )
      .orderBy(
        asc(stockOwnershipEvents.effectiveFrom),
        asc(stockOwnershipEvents.createdAt),
      )
      .limit(1);

    return row?.workerId ?? null;
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
    return this.db.transaction(async (tx) => {
      const [handoverOutEvent] = await tx
        .insert(stockOwnershipEvents)
        .values({
          skuId: input.skuId,
          locationId: input.locationId,
          workerId: input.fromWorkerId,
          eventType: "handover_out",
          quantity: input.quantity,
          effectiveFrom: input.effectiveFrom,
          handoverChainId: input.handoverChainId,
          createdBy: input.createdBy,
        })
        .returning();

      const [handoverInEvent] = await tx
        .insert(stockOwnershipEvents)
        .values({
          skuId: input.skuId,
          locationId: input.locationId,
          workerId: input.toWorkerId,
          eventType: "handover_in",
          quantity: input.quantity,
          effectiveFrom: sql`${input.effectiveFrom}::timestamptz + interval '1 microsecond'`,
          handoverChainId: input.handoverChainId,
          createdBy: input.createdBy,
        })
        .returning();

      if (!handoverOutEvent || !handoverInEvent) {
        throw new Error("Failed to insert handover events.");
      }

      return {
        handoverInEvent,
        handoverOutEvent,
      };
    });
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
    const [row] = await this.db
      .insert(stockOwnershipEvents)
      .values({
        skuId: input.skuId,
        locationId: input.locationId,
        workerId: input.workerId,
        eventType: "reverted",
        quantity: input.quantity,
        effectiveFrom: input.effectiveFrom,
        handoverChainId: input.handoverChainId,
        createdBy: input.createdBy,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert a reverted ownership event.");
    }

    return row;
  }
}
