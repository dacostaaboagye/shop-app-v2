import { stockOwnershipEvents } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { OwnershipEventWriteRepository } from "./ownership-event-write.service.js";
import type { OwnershipEventRecord } from "./ownership-query.service.js";

export class PostgresOwnershipEventRepository
  implements OwnershipEventWriteRepository
{
  constructor(private readonly db: ApiDatabase) {}

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
    const [row] = await this.db
      .insert(stockOwnershipEvents)
      .values({
        skuId: input.skuId,
        locationId: input.locationId,
        workerId: input.workerId,
        eventType: input.eventType,
        quantity: input.quantity,
        effectiveFrom: input.effectiveFrom,
        handoverChainId: input.handoverChainId,
        createdBy: input.createdBy,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to insert an ownership event.");
    }

    return row;
  }
}
