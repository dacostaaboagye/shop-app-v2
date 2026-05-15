import type {
  StockTakeApplyResponse,
  StockTakeDryRunRowError,
} from "@shop/contracts";
import { stockBalances } from "@shop/database";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { normalizeSku } from "./stock-take-import.service-support.js";
import type { ParsedStockTakeImportRow } from "./stock-take-import-parser.js";

export type ApplyLine = {
  countedQuantity: number;
  lineNumber: number;
  note: string | null;
  rowNumber: number;
  sku: string;
};

export type LockedApplyLine = {
  expectedOnHand: number;
  lineNumber: number;
  productName: string;
  rowStatus: "catalog_sku" | "manual_blank" | "counted" | "skipped";
  sku: string;
  skuId: string | null;
  variantName: string;
};

export function toApplyRows(rows: ParsedStockTakeImportRow[]): ApplyLine[] {
  return rows.flatMap((row) =>
    row.countedQuantity == null
      ? []
      : [
          {
            countedQuantity: row.countedQuantity,
            lineNumber: row.lineNumber ?? 0,
            note: row.note,
            rowNumber: row.rowNumber,
            sku: row.sku,
          },
        ],
  );
}

export async function materializeBalances(
  tx: ApiDatabase,
  input: { locationId: string; now: Date; skuIds: string[] },
) {
  if (input.skuIds.length === 0) return;

  await tx
    .insert(stockBalances)
    .values(
      input.skuIds.map((skuId) => ({
        createdAt: input.now,
        locationId: input.locationId,
        onHandQuantity: 0,
        reservedQuantity: 0,
        skuId,
        updatedAt: input.now,
      })),
    )
    .onConflictDoNothing({
      target: [stockBalances.skuId, stockBalances.locationId],
    });
}

export async function getBalancesForUpdate(
  tx: ApiDatabase,
  input: { locationId: string; skuIds: string[] },
) {
  if (input.skuIds.length === 0) return [];

  return tx
    .select({
      onHandQuantity: stockBalances.onHandQuantity,
      reservedQuantity: stockBalances.reservedQuantity,
      skuId: stockBalances.skuId,
    })
    .from(stockBalances)
    .where(
      and(
        eq(stockBalances.locationId, input.locationId),
        inArray(stockBalances.skuId, input.skuIds),
      ),
    )
    .orderBy(asc(stockBalances.skuId))
    .for("update");
}

export function findApplyConflicts(input: {
  applyRowBySku: Map<string, ApplyLine>;
  balanceBySkuId: Map<
    string,
    { onHandQuantity: number; reservedQuantity: number }
  >;
  lines: LockedApplyLine[];
}): StockTakeDryRunRowError[] {
  return input.lines.flatMap((line): StockTakeDryRunRowError[] => {
    const applyRow = input.applyRowBySku.get(normalizeSku(line.sku));
    const balance = line.skuId
      ? input.balanceBySkuId.get(line.skuId)
      : undefined;
    if (!applyRow || !balance) return [];
    if (applyRow.countedQuantity < balance.reservedQuantity) {
      return [
        {
          code: "reserved_conflict" as const,
          field: "countedQuantity" as const,
          lineNumber: line.lineNumber,
          message: "Counted quantity is below current reserved quantity.",
          rowNumber: applyRow.rowNumber,
          sku: line.sku,
        },
      ];
    }
    if (balance.onHandQuantity !== line.expectedOnHand) {
      return [
        {
          code: "system_drift" as const,
          lineNumber: line.lineNumber,
          message:
            "System stock changed after this stock-take was generated. Regenerate the sheet before applying.",
          rowNumber: applyRow.rowNumber,
          sku: line.sku,
        },
      ];
    }
    return [];
  });
}

export function buildApplySummary(
  lines: StockTakeApplyResponse["lines"],
): StockTakeApplyResponse["summary"] {
  return {
    appliedRows: lines.length,
    changedRows: lines.filter((line) => line.quantityDelta !== 0).length,
    noChangeRows: lines.filter((line) => line.quantityDelta === 0).length,
    totalNegativeDelta: lines.reduce(
      (sum, line) => sum + Math.min(line.quantityDelta, 0),
      0,
    ),
    totalPositiveDelta: lines.reduce(
      (sum, line) => sum + Math.max(line.quantityDelta, 0),
      0,
    ),
  };
}
