import type { ActiveReservationSummary as AdminActiveReservationSummary } from "@shop/contracts";
import { stockReservations } from "@shop/database";
import { and, eq, lte } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  ActiveReservationQueryRepository,
  ActiveReservationSummary,
} from "./active-reservation-query.service.js";

export class PostgresActiveReservationQueryRepository
  implements ActiveReservationQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listActiveReservations(input: {
    expiresAfter?: Date;
    expiresBefore?: Date;
    limit: number;
    locationId: string;
    skuId?: string;
    sourceType?: string;
  }): Promise<ActiveReservationSummary[]> {
    const rows = await this.db.query.stockReservations.findMany({
      where: (r, { eq, and, lte, gte }) =>
        and(
          eq(r.status, "active"),
          eq(r.locationId, input.locationId),
          input.skuId ? eq(r.skuId, input.skuId) : undefined,
          input.sourceType ? eq(r.sourceType, input.sourceType) : undefined,
          input.expiresBefore ? lte(r.expiresAt, input.expiresBefore) : undefined,
          input.expiresAfter ? gte(r.expiresAt, input.expiresAfter) : undefined,
        ),
      orderBy: (r, { asc }) => [asc(r.expiresAt), asc(r.createdAt)],
      limit: input.limit,
    });

    return rows.map((row) => ({
      ...row,
      status: "active" as const,
      expiresAt: row.expiresAt ?? null,
    }));
  }

  async findExpiredReservations(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: stockReservations.id })
      .from(stockReservations)
      .where(
        and(eq(stockReservations.status, "active"), lte(stockReservations.expiresAt, now)),
      );

    return rows.map((r) => r.id);
  }
}
