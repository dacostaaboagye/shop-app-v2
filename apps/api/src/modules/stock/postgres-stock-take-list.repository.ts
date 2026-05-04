import type {
  StockTakeSessionListQuery,
  StockTakeSessionSummary,
} from "@shop/contracts";
import {
  locations,
  stockTakeLines,
  stockTakeSessions,
  users,
} from "@shop/database";
import { and, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export class PostgresStockTakeListRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listSessions(input: {
    portal: "admin" | "manager";
    query: StockTakeSessionListQuery;
  }): Promise<{ items: StockTakeSessionSummary[]; totalCount: number }> {
    const filter = this.buildFilter(input.query);
    const [countResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockTakeSessions)
      .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
      .where(filter);
    const stats = this.lineStats();
    const rows = await this.db
      .select({
        appliedAt: stockTakeSessions.appliedAt,
        appliedByUserSlug: users.slug,
        generatedAt: stockTakeSessions.generatedAt,
        generatedByUserSlug: stockTakeSessions.generatedBySlug,
        lineCount: stats.lineCount,
        nonManualLineCount: stats.nonManualLineCount,
        locationName: locations.name,
        locationSlug: locations.slug,
        mode: stockTakeSessions.mode,
        reference: stockTakeSessions.reference,
        status: stockTakeSessions.status,
      })
      .from(stockTakeSessions)
      .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
      .leftJoin(users, eq(users.id, stockTakeSessions.appliedBy))
      .leftJoin(stats, eq(stats.sessionId, stockTakeSessions.id))
      .where(filter)
      .orderBy(desc(stockTakeSessions.generatedAt))
      .limit(input.query.pageSize)
      .offset((input.query.page - 1) * input.query.pageSize);

    return {
      items: rows.map((row) => toSummary(row, input.portal)),
      totalCount: countResult?.count ?? 0,
    };
  }

  private buildFilter(query: StockTakeSessionListQuery): SQL | undefined {
    const search = query.q?.trim() ?? "";
    const pattern = `%${search}%`;
    return and(
      query.locationSlug ? eq(locations.slug, query.locationSlug) : undefined,
      query.mode ? eq(stockTakeSessions.mode, query.mode) : undefined,
      query.status ? eq(stockTakeSessions.status, query.status) : undefined,
      search
        ? or(
            ilike(stockTakeSessions.reference, pattern),
            ilike(locations.name, pattern),
            ilike(stockTakeSessions.generatedBySlug, pattern),
          )
        : undefined,
    );
  }

  private lineStats() {
    return this.db
      .select({
        lineCount: sql<number>`cast(count(*) as int)`.as("line_count"),
        nonManualLineCount:
          sql<number>`cast(sum(case when ${stockTakeLines.rowStatus} = 'manual_blank' then 0 else 1 end) as int)`.as(
            "non_manual_line_count",
          ),
        sessionId: stockTakeLines.sessionId,
      })
      .from(stockTakeLines)
      .groupBy(stockTakeLines.sessionId)
      .as("stock_take_line_stats");
  }
}

type SessionListRow = {
  appliedAt: Date | null;
  appliedByUserSlug: string | null;
  generatedAt: Date;
  generatedByUserSlug: string | null;
  lineCount: number | null;
  locationName: string;
  locationSlug: string;
  mode: StockTakeSessionSummary["mode"];
  nonManualLineCount: number | null;
  reference: string;
  status: StockTakeSessionSummary["status"];
};

function toSummary(
  row: SessionListRow,
  portal: "admin" | "manager",
): StockTakeSessionSummary {
  const base = `/api/${portal}/stock-takes/${row.reference}`;
  return {
    appliedAt: row.appliedAt?.toISOString() ?? null,
    appliedByUserSlug: row.appliedByUserSlug,
    blankSheet: (row.nonManualLineCount ?? 0) === 0,
    bookletPdfUrl: `${base}/booklet.pdf`,
    generatedAt: row.generatedAt.toISOString(),
    generatedByUserSlug: row.generatedByUserSlug,
    lineCount: row.lineCount ?? 0,
    locationName: row.locationName,
    locationSlug: row.locationSlug,
    mode: row.mode,
    printableBookletUrl: `/${portal}/stock/takes/${row.reference}/booklet`,
    sheetCsvUrl: `${base}/sheet.csv`,
    status: row.status,
    stockTakeReference: row.reference,
    varianceReportPdfUrl:
      row.status === "applied" ? `${base}/variance-report.pdf` : null,
  };
}
