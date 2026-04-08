import type { Pool } from "pg";
import type { ReferenceNumberRepository } from "./reference-number.service.js";

export class PostgresReferenceNumberRepository
  implements ReferenceNumberRepository
{
  constructor(private readonly pool: Pool) {}

  async reserveNextSequenceValue(input: {
    description: string;
    now: Date;
    sequenceKey: string;
    startsAt: number;
  }): Promise<number> {
    const result = await this.pool.query<{ currentValue: number }>(
      `
        INSERT INTO sequence_counters (
          sequence_key,
          current_value,
          description,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (sequence_key)
        DO UPDATE
        SET
          current_value = sequence_counters.current_value + 1,
          description = COALESCE(sequence_counters.description, EXCLUDED.description),
          updated_at = EXCLUDED.updated_at
        RETURNING current_value AS "currentValue"
      `,
      [input.sequenceKey, input.startsAt, input.description, input.now],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Failed to reserve the next sequence value.");
    }

    return row.currentValue;
  }
}
