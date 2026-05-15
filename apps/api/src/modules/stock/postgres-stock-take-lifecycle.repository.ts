import type {
  StockTakeDryRunRowError,
  StockTakeLineCountEntry,
  StockTakeSessionSummary,
  StockTakeStatus,
} from "@shop/contracts";
import { locations, stockTakeLines, stockTakeSessions } from "@shop/database";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { validateLineCountEntries } from "./stock-take-line-count.support.js";

export const CANCELLABLE_STOCK_TAKE_STATUSES = [
  "generated",
  "counted",
  "reviewed",
] as const;

export const COUNTABLE_STOCK_TAKE_STATUSES = [
  "generated",
  "counted",
  "reviewed",
] as const;

export type StockTakeLineCountUpdateOutcome =
  | { kind: "not_found" }
  | { kind: "conflict"; status: "applied" | "cancelled" }
  | { kind: "validation_error"; errors: StockTakeDryRunRowError[] }
  | {
      kind: "ok";
      status: StockTakeStatus;
      stockTakeReference: string;
      updatedCount: number;
    };

export class PostgresStockTakeLifecycleRepository {
  constructor(private readonly db: ApiDatabase) {}

  async cancelSession(input: {
    cancelledBy?: string;
    now: Date;
    portal: "admin" | "manager";
    reference: string;
  }): Promise<StockTakeSessionSummary | null> {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .update(stockTakeSessions)
        .set({
          cancelledAt: input.now,
          cancelledBy: input.cancelledBy ?? null,
          status: "cancelled",
          updatedAt: input.now,
        })
        .where(
          and(
            eq(stockTakeSessions.reference, input.reference),
            inArray(stockTakeSessions.status, CANCELLABLE_STOCK_TAKE_STATUSES),
          ),
        )
        .returning({
          appliedAt: stockTakeSessions.appliedAt,
          generatedAt: stockTakeSessions.generatedAt,
          generatedByUserSlug: stockTakeSessions.generatedBySlug,
          id: stockTakeSessions.id,
          locationId: stockTakeSessions.locationId,
          mode: stockTakeSessions.mode,
          reference: stockTakeSessions.reference,
          status: stockTakeSessions.status,
        });

      if (!session) return null;

      const [location] = await tx
        .select({ name: locations.name, slug: locations.slug })
        .from(locations)
        .where(eq(locations.id, session.locationId))
        .limit(1);
      const [lineStats] = await tx
        .select({
          lineCount: sql<number>`cast(count(*) as int)`,
          nonManualLineCount: sql<number>`cast(sum(case when ${stockTakeLines.rowStatus} = 'manual_blank' then 0 else 1 end) as int)`,
        })
        .from(stockTakeLines)
        .where(eq(stockTakeLines.sessionId, session.id));

      return {
        appliedAt: session.appliedAt?.toISOString() ?? null,
        appliedByUserSlug: null,
        blankSheet: (lineStats?.nonManualLineCount ?? 0) === 0,
        bookletPdfUrl: `/api/${input.portal}/stock-takes/${session.reference}/booklet.pdf`,
        generatedAt: session.generatedAt.toISOString(),
        generatedByUserSlug: session.generatedByUserSlug,
        lineCount: lineStats?.lineCount ?? 0,
        locationName: location?.name ?? "",
        locationSlug: location?.slug ?? "",
        mode: session.mode,
        printableBookletUrl: `/${input.portal}/stock/takes/${session.reference}/booklet`,
        sheetCsvUrl: `/api/${input.portal}/stock-takes/${session.reference}/sheet.csv`,
        sheetXlsxUrl: `/api/${input.portal}/stock-takes/${session.reference}/sheet.xlsx`,
        status: session.status,
        stockTakeReference: session.reference,
        varianceReportPdfUrl: null,
      };
    });
  }

  async updateLineCounts(input: {
    entries: StockTakeLineCountEntry[];
    now: Date;
    reference: string;
  }): Promise<StockTakeLineCountUpdateOutcome> {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .select({
          id: stockTakeSessions.id,
          reference: stockTakeSessions.reference,
          status: stockTakeSessions.status,
        })
        .from(stockTakeSessions)
        .where(eq(stockTakeSessions.reference, input.reference))
        .for("update");

      if (!session) return { kind: "not_found" };
      if (session.status === "applied" || session.status === "cancelled") {
        return { kind: "conflict", status: session.status };
      }

      const existingLines = await tx
        .select({ lineNumber: stockTakeLines.lineNumber })
        .from(stockTakeLines)
        .where(eq(stockTakeLines.sessionId, session.id))
        .orderBy(asc(stockTakeLines.lineNumber));
      const knownLineNumbers = new Set(
        existingLines.map((line) => line.lineNumber),
      );
      const validation = validateLineCountEntries({
        entries: input.entries,
        knownLineNumbers,
      });

      if (validation.kind === "errors") {
        return { kind: "validation_error", errors: validation.errors };
      }

      let updatedCount = 0;
      for (const entry of input.entries) {
        const result = await tx
          .update(stockTakeLines)
          .set({
            countedQuantity: entry.countedQuantity,
            note: entry.note,
          })
          .where(
            and(
              eq(stockTakeLines.sessionId, session.id),
              eq(stockTakeLines.lineNumber, entry.lineNumber),
            ),
          )
          .returning({ lineNumber: stockTakeLines.lineNumber });
        updatedCount += result.length;
      }

      await tx
        .update(stockTakeSessions)
        .set({ updatedAt: input.now })
        .where(eq(stockTakeSessions.id, session.id));

      return {
        kind: "ok",
        status: session.status,
        stockTakeReference: session.reference,
        updatedCount,
      };
    });
  }
}
