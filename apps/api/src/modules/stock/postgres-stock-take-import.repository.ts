import { locations, stockTakeLines, stockTakeSessions } from "@shop/database";
import { asc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type StockTakeImportSession = {
  generatedAt: Date;
  locationId: string;
  locationName: string;
  locationSlug: string;
  mode: "blind" | "assisted";
  reference: string;
  status: "generated" | "counted" | "reviewed" | "applied" | "cancelled";
};

export type StockTakeImportLine = {
  availableQuantity: number;
  expectedOnHand: number;
  lineNumber: number;
  mode: "blind" | "assisted";
  productName: string;
  reservedQuantity: number;
  rowStatus: "catalog_sku" | "manual_blank" | "counted" | "skipped";
  sku: string;
  systemOnHand: number;
  variantName: string;
};

export type StockTakeImportSnapshot = {
  lines: StockTakeImportLine[];
  session: StockTakeImportSession;
};

export class PostgresStockTakeImportRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getSnapshot(
    reference: string,
  ): Promise<StockTakeImportSnapshot | null> {
    const [sessionRow] = await this.db
      .select({
        generatedAt: stockTakeSessions.generatedAt,
        locationId: locations.id,
        locationName: locations.name,
        locationSlug: locations.slug,
        mode: stockTakeSessions.mode,
        reference: stockTakeSessions.reference,
        sessionId: stockTakeSessions.id,
        status: stockTakeSessions.status,
      })
      .from(stockTakeSessions)
      .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
      .where(eq(stockTakeSessions.reference, reference))
      .limit(1);

    if (!sessionRow) return null;

    const rows = await this.db
      .select({
        availableQuantity: stockTakeLines.expectedAvailableSnapshot,
        expectedOnHand: stockTakeLines.expectedOnHandSnapshot,
        lineNumber: stockTakeLines.lineNumber,
        productName: stockTakeLines.productNameSnapshot,
        reservedQuantity: stockTakeLines.expectedReservedSnapshot,
        rowStatus: stockTakeLines.rowStatus,
        sku: stockTakeLines.skuSnapshot,
        variantName: stockTakeLines.variantNameSnapshot,
      })
      .from(stockTakeLines)
      .innerJoin(
        stockTakeSessions,
        eq(stockTakeSessions.id, stockTakeLines.sessionId),
      )
      .where(eq(stockTakeLines.sessionId, sessionRow.sessionId))
      .orderBy(asc(stockTakeLines.lineNumber));

    return {
      lines: rows.map((row) => ({
        availableQuantity: row.availableQuantity,
        expectedOnHand: row.expectedOnHand,
        lineNumber: row.lineNumber,
        mode: sessionRow.mode,
        productName: row.productName,
        reservedQuantity: row.reservedQuantity,
        rowStatus: row.rowStatus,
        sku: row.sku,
        systemOnHand: row.expectedOnHand,
        variantName: row.variantName,
      })),
      session: {
        generatedAt: sessionRow.generatedAt,
        locationId: sessionRow.locationId,
        locationName: sessionRow.locationName,
        locationSlug: sessionRow.locationSlug,
        mode: sessionRow.mode,
        reference: sessionRow.reference,
        status: sessionRow.status,
      },
    };
  }
}
