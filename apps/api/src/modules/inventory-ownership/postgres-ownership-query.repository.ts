import { stockOwnershipEvents } from "@shop/database";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  OwnershipEventRecord,
  OwnershipQueryRepository,
} from "./ownership-query.service.js";

export class PostgresOwnershipQueryRepository
  implements OwnershipQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getLatestEventAtOrBefore(input: {
    locationId: string;
    skuId: string;
    timestamp: Date;
  }): Promise<OwnershipEventRecord | null> {
    const [row] = await this.db
      .select()
      .from(stockOwnershipEvents)
      .where(
        and(
          eq(stockOwnershipEvents.skuId, input.skuId),
          eq(stockOwnershipEvents.locationId, input.locationId),
          lte(stockOwnershipEvents.effectiveFrom, input.timestamp),
        ),
      )
      .orderBy(
        desc(stockOwnershipEvents.effectiveFrom),
        desc(stockOwnershipEvents.createdAt),
      )
      .limit(1);

    return row ?? null;
  }

  async getOwnershipHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<OwnershipEventRecord[]> {
    return this.db
      .select()
      .from(stockOwnershipEvents)
      .where(
        and(
          eq(stockOwnershipEvents.skuId, input.skuId),
          eq(stockOwnershipEvents.locationId, input.locationId),
        ),
      )
      .orderBy(
        asc(stockOwnershipEvents.effectiveFrom),
        asc(stockOwnershipEvents.createdAt),
      );
  }
}
