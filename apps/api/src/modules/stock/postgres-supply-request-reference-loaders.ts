import { goodsTransferNotes, stockTransfers } from "@shop/database";
import { inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function loadGtnReferenceMap(
  db: ApiDatabase,
  supplyRequestIds: string[],
): Promise<Map<string, string>> {
  if (supplyRequestIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      reference: goodsTransferNotes.reference,
      supplyRequestId: goodsTransferNotes.supplyRequestId,
    })
    .from(goodsTransferNotes)
    .where(inArray(goodsTransferNotes.supplyRequestId, supplyRequestIds));

  return new Map(rows.map((row) => [row.supplyRequestId, row.reference]));
}

export async function loadReservationStatusMap(
  db: ApiDatabase,
  supplyRequestIds: string[],
): Promise<
  Map<string, "active" | "cancelled" | "confirmed" | "expired" | "released">
> {
  if (supplyRequestIds.length === 0 || !db.query.stockReservations) {
    return new Map();
  }

  const rows = await db.query.stockReservations.findMany({
    columns: {
      sourceKey: true,
      status: true,
      updatedAt: true,
    },
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    where: (table, { and, eq, inArray: inArrayValues }) =>
      and(
        eq(table.sourceType, "supply_request"),
        inArrayValues(table.sourceKey, supplyRequestIds),
      ),
  });

  const statusBySupplyRequestId = new Map<
    string,
    "active" | "cancelled" | "confirmed" | "expired" | "released"
  >();

  for (const row of rows) {
    if (!statusBySupplyRequestId.has(row.sourceKey)) {
      statusBySupplyRequestId.set(row.sourceKey, row.status);
    }
  }

  return statusBySupplyRequestId;
}

export async function loadTransferReferenceMap(
  db: ApiDatabase,
  supplyRequestIds: string[],
): Promise<Map<string, string>> {
  if (supplyRequestIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      reference: stockTransfers.reference,
      supplyRequestId: stockTransfers.supplyRequestId,
    })
    .from(stockTransfers)
    .where(inArray(stockTransfers.supplyRequestId, supplyRequestIds));

  return new Map(rows.map((row) => [row.supplyRequestId, row.reference]));
}
