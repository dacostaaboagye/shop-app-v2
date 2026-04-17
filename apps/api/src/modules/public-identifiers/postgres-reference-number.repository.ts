import { sequenceCounters } from "@shop/database";
import { sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { ReferenceNumberRepository } from "./reference-number.service.js";

export class PostgresReferenceNumberRepository
  implements ReferenceNumberRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async reserveNextSequenceValue(input: {
    description: string;
    now: Date;
    sequenceKey: string;
    startsAt: number;
  }): Promise<number> {
    const [row] = await this.db
      .insert(sequenceCounters)
      .values({
        sequenceKey: input.sequenceKey,
        currentValue: input.startsAt,
        description: input.description,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: sequenceCounters.sequenceKey,
        set: {
          currentValue: sql`${sequenceCounters.currentValue} + 1`,
          description: sql`COALESCE(${sequenceCounters.description}, EXCLUDED.description)`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      })
      .returning({ currentValue: sequenceCounters.currentValue });

    if (!row) {
      throw new Error("Failed to reserve the next sequence value.");
    }

    return row.currentValue;
  }
}
