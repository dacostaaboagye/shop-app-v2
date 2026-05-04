import type {
  StockTakeApplyResponse,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import {
  locations,
  stockBalances,
  stockMovements,
  stockTakeLines,
  stockTakeSessions,
} from "@shop/database";
import { and, asc, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import {
  buildApplySummary,
  findApplyConflicts,
  getBalancesForUpdate,
  materializeBalances,
  toApplyRows,
} from "./stock-take-apply.repository-support.js";
import { normalizeSku } from "./stock-take-import.service-support.js";
import type { ParsedStockTakeImportRow } from "./stock-take-import-parser.js";

export class PostgresStockTakeApplyRepository {
  constructor(private readonly db: ApiDatabase) {}

  async apply(input: {
    appliedBy?: string;
    appliedBySlug?: string;
    reference: string;
    rows: ParsedStockTakeImportRow[];
  }): Promise<StockTakeApplyResponse> {
    return this.db.transaction(async (tx) => {
      const [session] = await tx
        .select({
          id: stockTakeSessions.id,
          locationId: locations.id,
          locationName: locations.name,
          locationSlug: locations.slug,
          reference: stockTakeSessions.reference,
          status: stockTakeSessions.status,
        })
        .from(stockTakeSessions)
        .innerJoin(locations, eq(locations.id, stockTakeSessions.locationId))
        .where(eq(stockTakeSessions.reference, input.reference))
        .for("update");

      if (!session) throw stockTakeApplyNotFound(input.reference);
      if (session.status === "cancelled") {
        throw stockTakeApplyConflict(input.reference, "cancelled");
      }
      if (session.status === "applied") {
        throw stockTakeApplyConflict(input.reference, "already applied");
      }

      const lockedLines = await tx
        .select({
          expectedOnHand: stockTakeLines.expectedOnHandSnapshot,
          lineNumber: stockTakeLines.lineNumber,
          productName: stockTakeLines.productNameSnapshot,
          rowStatus: stockTakeLines.rowStatus,
          sku: stockTakeLines.skuSnapshot,
          skuId: stockTakeLines.skuId,
          variantName: stockTakeLines.variantNameSnapshot,
        })
        .from(stockTakeLines)
        .where(eq(stockTakeLines.sessionId, session.id))
        .orderBy(asc(stockTakeLines.lineNumber))
        .for("update");

      const applyRows = toApplyRows(input.rows);
      const applyRowBySku = new Map(
        applyRows.map((row) => [normalizeSku(row.sku), row]),
      );
      const catalogLines = lockedLines.filter(
        (line) => line.rowStatus !== "manual_blank" && line.skuId,
      );
      const skuIds = [...new Set(catalogLines.map((line) => line.skuId ?? ""))]
        .filter(Boolean)
        .sort();
      await materializeBalances(tx, {
        locationId: session.locationId,
        now: new Date(),
        skuIds,
      });
      const balances = await getBalancesForUpdate(tx, {
        locationId: session.locationId,
        skuIds,
      });
      const balanceBySkuId = new Map(
        balances.map((balance) => [balance.skuId, balance]),
      );
      const conflicts = findApplyConflicts({
        applyRowBySku,
        balanceBySkuId,
        lines: catalogLines,
      });
      if (conflicts.length > 0) throw stockTakeApplyRowConflict(conflicts);

      const now = new Date();
      const appliedLines = [];
      for (const line of catalogLines) {
        const applyRow = applyRowBySku.get(normalizeSku(line.sku));
        if (!applyRow || !line.skuId) continue;
        const balance = balanceBySkuId.get(line.skuId);
        const previousOnHand = balance?.onHandQuantity ?? 0;
        const quantityDelta = applyRow.countedQuantity - previousOnHand;

        await tx
          .update(stockTakeLines)
          .set({
            appliedDelta: quantityDelta,
            countedQuantity: applyRow.countedQuantity,
            note: applyRow.note,
            rowStatus: "counted",
          })
          .where(
            and(
              eq(stockTakeLines.sessionId, session.id),
              eq(stockTakeLines.lineNumber, line.lineNumber),
            ),
          );

        if (quantityDelta !== 0) {
          await tx
            .update(stockBalances)
            .set({
              onHandQuantity: applyRow.countedQuantity,
              updatedAt: now,
              updatedBy: input.appliedBy ?? null,
            })
            .where(
              and(
                eq(stockBalances.locationId, session.locationId),
                eq(stockBalances.skuId, line.skuId),
              ),
            );
          await tx.insert(stockMovements).values({
            createdAt: now,
            createdBy: input.appliedBy ?? null,
            locationId: session.locationId,
            movementType: "manual_adjustment",
            occurredAt: now,
            quantityDelta,
            reasonCode: "cycle_count",
            skuId: line.skuId,
            sourceKey: `${session.reference}:${line.lineNumber}`,
            sourceType: "stock_take",
          });
        }

        appliedLines.push({
          countedQuantity: applyRow.countedQuantity,
          lineNumber: line.lineNumber,
          movementCreated: quantityDelta !== 0,
          previousOnHandQuantity: previousOnHand,
          productName: line.productName,
          quantityDelta,
          sku: line.sku,
          status:
            quantityDelta === 0 ? ("no_change" as const) : ("changed" as const),
          variantName: line.variantName,
        });
      }

      await tx
        .update(stockTakeSessions)
        .set({
          appliedAt: now,
          appliedBy: input.appliedBy ?? null,
          status: "applied",
          updatedAt: now,
        })
        .where(eq(stockTakeSessions.id, session.id));

      return {
        appliedAt: now.toISOString(),
        appliedByUserSlug: input.appliedBySlug ?? null,
        lines: appliedLines,
        locationName: session.locationName,
        locationSlug: session.locationSlug,
        status: "applied",
        stockTakeReference: session.reference,
        summary: buildApplySummary(appliedLines),
      };
    });
  }
}

function stockTakeApplyNotFound(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Stock take "${reference}" was not found.`,
    statusCode: 404,
    title: "Stock take not found",
  });
}

function stockTakeApplyConflict(reference: string, state: string): AppError {
  return new AppError({
    code: "conflict",
    detail: `Stock take "${reference}" is ${state} and cannot be applied.`,
    statusCode: 409,
    title: "Stock take unavailable",
  });
}

function stockTakeApplyRowConflict(
  errors: StockTakeDryRunRowError[],
): AppError {
  return new AppError({
    code: "conflict",
    detail: "One or more stock-take lines cannot be applied.",
    details: { errors },
    statusCode: 409,
    title: "Stock take apply conflict",
  });
}
