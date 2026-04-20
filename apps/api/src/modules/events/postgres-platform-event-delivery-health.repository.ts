import { platformEvents } from "@shop/database";
import { sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type PlatformEventDeliveryHealthRow = {
  deliveredCount: number;
  failedCount: number;
  oldestFailedAt: Date | null;
  oldestPendingAt: Date | null;
  pendingCount: number;
  processingCount: number;
  statusCounts: Array<{
    count: number;
    status: "delivered" | "failed" | "pending" | "processing";
  }>;
  stuckProcessingCount: number;
};

type StatusCountRow = {
  count: number;
  status: "delivered" | "failed" | "pending" | "processing";
};

type SummaryRow = Omit<PlatformEventDeliveryHealthRow, "statusCounts">;

export class PostgresPlatformEventDeliveryHealthRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getHealth(input: {
    staleProcessingBefore: Date;
  }): Promise<PlatformEventDeliveryHealthRow> {
    const [summaryRow] = (await this.db
      .select({
        deliveredCount: countStatus("delivered"),
        failedCount: countStatus("failed"),
        oldestFailedAt:
          sql<Date | null>`min(${platformEvents.occurredAt}) filter (where ${platformEvents.deliveryStatus} = 'failed')`,
        oldestPendingAt:
          sql<Date | null>`min(${platformEvents.occurredAt}) filter (where ${platformEvents.deliveryStatus} = 'pending')`,
        pendingCount: countStatus("pending"),
        processingCount: countStatus("processing"),
        stuckProcessingCount:
          sql<number>`cast(count(*) filter (
            where ${platformEvents.deliveryStatus} = 'processing'
            and ${platformEvents.processingStartedAt} <= ${input.staleProcessingBefore}
          ) as int)`,
      })
      .from(platformEvents)) as SummaryRow[];

    const statusCounts = (await this.db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        status: platformEvents.deliveryStatus,
      })
      .from(platformEvents)
      .groupBy(platformEvents.deliveryStatus)) as StatusCountRow[];

    return {
      deliveredCount: summaryRow?.deliveredCount ?? 0,
      failedCount: summaryRow?.failedCount ?? 0,
      oldestFailedAt: summaryRow?.oldestFailedAt ?? null,
      oldestPendingAt: summaryRow?.oldestPendingAt ?? null,
      pendingCount: summaryRow?.pendingCount ?? 0,
      processingCount: summaryRow?.processingCount ?? 0,
      statusCounts: normalizeStatusCounts(statusCounts),
      stuckProcessingCount: summaryRow?.stuckProcessingCount ?? 0,
    };
  }
}

function countStatus(status: StatusCountRow["status"]) {
  return sql<number>`cast(count(*) filter (where ${platformEvents.deliveryStatus} = ${status}) as int)`;
}

function normalizeStatusCounts(rows: StatusCountRow[]) {
  const countByStatus = new Map(rows.map((row) => [row.status, row.count]));

  return (["pending", "processing", "delivered", "failed"] as const).map(
    (status) => ({
      count: countByStatus.get(status) ?? 0,
      status,
    }),
  );
}
