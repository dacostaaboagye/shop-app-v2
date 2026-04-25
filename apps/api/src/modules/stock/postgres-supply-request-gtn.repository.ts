import type { ApiDatabase } from "../../infrastructure/database.js";
import { gtnRelations } from "./postgres-supply-request.repository-support.js";
import type { GtnRow } from "./postgres-supply-request-mappers.js";
import { toGtnRow } from "./postgres-supply-request-mappers.js";

export async function findGtnBySupplyRequest(
  db: ApiDatabase,
  supplyRequestId: string,
): Promise<GtnRow | null> {
  const gtn = await db.query.goodsTransferNotes.findFirst({
    where: (table, { eq }) => eq(table.supplyRequestId, supplyRequestId),
    with: gtnRelations,
  });
  return gtn ? toGtnRow(gtn) : null;
}

export async function findGtnById(
  db: ApiDatabase,
  id: string,
): Promise<GtnRow | null> {
  const gtn = await db.query.goodsTransferNotes.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    with: gtnRelations,
  });
  return gtn ? toGtnRow(gtn) : null;
}

export async function findGtnByReference(
  db: ApiDatabase,
  reference: string,
): Promise<GtnRow | null> {
  const gtn = await db.query.goodsTransferNotes.findFirst({
    where: (table, { eq }) => eq(table.reference, reference),
    with: gtnRelations,
  });
  return gtn ? toGtnRow(gtn) : null;
}

export async function findGtnReferenceForRequest(
  db: ApiDatabase,
  id: string,
  status: string,
) {
  if (status !== "dispatched" && status !== "received") {
    return null;
  }

  const gtn = await db.query.goodsTransferNotes.findFirst({
    columns: { reference: true },
    where: (table, { eq }) => eq(table.supplyRequestId, id),
  });
  return gtn?.reference ?? null;
}

export async function findTransferReferenceForRequest(
  db: ApiDatabase,
  id: string,
) {
  const transfer = await db.query.stockTransfers.findFirst({
    columns: { reference: true },
    where: (table, { eq }) => eq(table.supplyRequestId, id),
  });
  return transfer?.reference ?? null;
}
