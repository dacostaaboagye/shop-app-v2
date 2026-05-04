import type {
  StockTakeCreateRequest,
  StockTakeSessionDetail,
} from "@shop/contracts";
import {
  locations,
  stockTakeLines,
  stockTakeSessions,
  users,
} from "@shop/database";
import { asc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  buildStockTakeSessionDetail,
  mapStockTakeLineInsertToDto,
  selectActiveStockTakeVariantRows,
} from "./postgres-stock-take.repository-support.js";

type StockTakeLocation = { id: string; name: string; slug: string };

export class PostgresStockTakeRepository {
  constructor(private readonly db: ApiDatabase) {}

  async createSession(input: {
    generatedBy?: string;
    generatedBySlug?: string;
    location: StockTakeLocation;
    now: Date;
    portal: "admin" | "manager";
    reference: string;
    request: StockTakeCreateRequest;
  }): Promise<StockTakeSessionDetail> {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .insert(stockTakeSessions)
        .values({
          createdAt: input.now,
          generatedAt: input.now,
          generatedBy: input.generatedBy ?? null,
          generatedBySlug: input.generatedBySlug ?? null,
          locationId: input.location.id,
          mode: input.request.mode,
          reference: input.reference,
          scope: {
            ...(input.request.brandSlug
              ? { brandSlug: input.request.brandSlug }
              : {}),
            ...(input.request.categorySlug
              ? { categorySlug: input.request.categorySlug }
              : {}),
            ...(input.request.q ? { q: input.request.q } : {}),
          },
          sourceFileName: `${input.reference}-${input.location.slug}-sheet.csv`,
          status: "generated",
          updatedAt: input.now,
        })
        .returning({
          generatedAt: stockTakeSessions.generatedAt,
          id: stockTakeSessions.id,
          mode: stockTakeSessions.mode,
          reference: stockTakeSessions.reference,
          status: stockTakeSessions.status,
        });

      if (!session) {
        throw new Error("Failed to create stock-take session.");
      }

      const variantRows = await selectActiveStockTakeVariantRows(tx, {
        ...input.request,
        locationId: input.location.id,
      });
      const preparedLines =
        variantRows.length > 0
          ? variantRows.map((row, index) => ({
              barcodeSnapshot: row.barcode,
              expectedAvailableSnapshot: row.availableQuantity,
              expectedOnHandSnapshot: row.onHandQuantity,
              expectedReservedSnapshot: row.reservedQuantity,
              lineNumber: index + 1,
              productNameSnapshot: row.productName,
              productSlugSnapshot: row.productSlug,
              rowStatus: "catalog_sku" as const,
              sessionId: session.id,
              skuId: row.skuId,
              skuSnapshot: row.sku,
              unitOfMeasureSnapshot: row.unitOfMeasure,
              variantNameSnapshot: row.variantName,
              variantSlugSnapshot: row.variantSlug,
            }))
          : Array.from({ length: 20 }, (_, index) => ({
              barcodeSnapshot: null,
              expectedAvailableSnapshot: 0,
              expectedOnHandSnapshot: 0,
              expectedReservedSnapshot: 0,
              lineNumber: index + 1,
              productNameSnapshot: "",
              productSlugSnapshot: null,
              rowStatus: "manual_blank" as const,
              sessionId: session.id,
              skuId: null,
              skuSnapshot: "",
              unitOfMeasureSnapshot: "",
              variantNameSnapshot: "",
              variantSlugSnapshot: null,
            }));

      await tx.insert(stockTakeLines).values(preparedLines);

      return buildStockTakeSessionDetail({
        appliedAt: null,
        appliedByUserSlug: null,
        generatedAt: session.generatedAt,
        generatedByUserSlug: input.generatedBySlug ?? null,
        lines: preparedLines.map(mapStockTakeLineInsertToDto),
        location: input.location,
        mode: session.mode,
        portal: input.portal,
        reference: session.reference,
        status: session.status,
      });
    });
  }

  async findLocationBySlug(slug: string): Promise<StockTakeLocation | null> {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.slug, slug))
      .limit(1);

    return location ?? null;
  }

  async findSessionLocationByReference(
    reference: string,
  ): Promise<StockTakeLocation | null> {
    const [row] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(stockTakeSessions)
      .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
      .where(eq(stockTakeSessions.reference, reference))
      .limit(1);

    return row ?? null;
  }

  async getSessionByReference(input: {
    portal: "admin" | "manager";
    reference: string;
  }): Promise<StockTakeSessionDetail | null> {
    const rows = await this.db
      .select({
        availableQuantity: stockTakeLines.expectedAvailableSnapshot,
        appliedDelta: stockTakeLines.appliedDelta,
        appliedAt: stockTakeSessions.appliedAt,
        appliedByUserSlug: users.slug,
        barcode: stockTakeLines.barcodeSnapshot,
        countedQuantity: stockTakeLines.countedQuantity,
        generatedAt: stockTakeSessions.generatedAt,
        generatedByUserSlug: stockTakeSessions.generatedBySlug,
        lineNumber: stockTakeLines.lineNumber,
        locationName: locations.name,
        locationSlug: locations.slug,
        mode: stockTakeSessions.mode,
        note: stockTakeLines.note,
        productName: stockTakeLines.productNameSnapshot,
        productSlug: stockTakeLines.productSlugSnapshot,
        reference: stockTakeSessions.reference,
        reservedQuantity: stockTakeLines.expectedReservedSnapshot,
        rowStatus: stockTakeLines.rowStatus,
        sku: stockTakeLines.skuSnapshot,
        status: stockTakeSessions.status,
        systemOnHand: stockTakeLines.expectedOnHandSnapshot,
        unitOfMeasure: stockTakeLines.unitOfMeasureSnapshot,
        variantName: stockTakeLines.variantNameSnapshot,
        variantSlug: stockTakeLines.variantSlugSnapshot,
      })
      .from(stockTakeSessions)
      .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
      .leftJoin(users, eq(users.id, stockTakeSessions.appliedBy))
      .innerJoin(
        stockTakeLines,
        eq(stockTakeLines.sessionId, stockTakeSessions.id),
      )
      .where(eq(stockTakeSessions.reference, input.reference))
      .orderBy(asc(stockTakeLines.lineNumber));

    const first = rows[0];
    if (!first) return null;

    return buildStockTakeSessionDetail({
      appliedAt: first.appliedAt,
      appliedByUserSlug: first.appliedByUserSlug,
      generatedAt: first.generatedAt,
      generatedByUserSlug: first.generatedByUserSlug,
      lines: rows.map((row) => ({
        availableQuantity: row.availableQuantity,
        appliedDelta: row.appliedDelta,
        barcode: row.barcode,
        countedQuantity: row.countedQuantity,
        lineNumber: row.lineNumber,
        note: row.note,
        productName: row.productName,
        productSlug: row.productSlug,
        reservedQuantity: row.reservedQuantity,
        rowStatus: row.rowStatus,
        sku: row.sku,
        systemOnHand: row.systemOnHand,
        unitOfMeasure: row.unitOfMeasure,
        variance:
          row.countedQuantity == null || first.mode === "blind"
            ? null
            : row.countedQuantity - row.systemOnHand,
        variantName: row.variantName,
        variantSlug: row.variantSlug,
      })),
      location: {
        id: "",
        name: first.locationName,
        slug: first.locationSlug,
      },
      mode: first.mode,
      portal: input.portal,
      reference: first.reference,
      status: first.status,
    });
  }
}
