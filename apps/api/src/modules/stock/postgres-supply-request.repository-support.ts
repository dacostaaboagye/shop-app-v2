import { stockSupplyRequests } from "@shop/database";
import { and, eq, inArray, type SQLWrapper, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  loadGtnReferenceMap,
  loadReservationStatusMap,
  loadTransferReferenceMap,
} from "./postgres-supply-request-reference-loaders.js";

export const gtnRelations = {
  destinationLocation: { columns: { name: true } },
  dispatchedByUser: { columns: { firstName: true, lastName: true } },
  receivedByUser: { columns: { firstName: true, lastName: true } },
  sourceLocation: { columns: { name: true } },
  supplyRequest: { columns: { reference: true } },
} as const;

export async function countSupplyRequests(
  db: ApiDatabase,
  conditions: SQLWrapper[],
) {
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockSupplyRequests)
    .where(and(...conditions));

  return countRows[0]?.count ?? 0;
}

export async function loadSupplyRequestDecorations(
  db: ApiDatabase,
  supplyRequestIds: string[],
) {
  const [
    gtnReferenceBySupplyRequestId,
    transferReferenceBySupplyRequestId,
    sourceReservationStatusByRequestId,
  ] = await Promise.all([
    loadGtnReferenceMap(db, supplyRequestIds),
    loadTransferReferenceMap(db, supplyRequestIds),
    loadReservationStatusMap(db, supplyRequestIds),
  ]);

  return {
    gtnReferenceBySupplyRequestId,
    sourceReservationStatusByRequestId,
    transferReferenceBySupplyRequestId,
  };
}

export function inArrayCondition(
  column: typeof stockSupplyRequests.sourceLocationId,
  values: string[],
) {
  if (values.length === 1) {
    const [value] = values;
    if (!value) {
      throw new Error("Expected one source location id.");
    }

    return eq(column, value);
  }

  return inArray(column, values);
}

export function formatRequesterName(
  requester: { firstName: string; lastName: string } | null,
) {
  return requester
    ? `${requester.firstName} ${requester.lastName}`.trim() || null
    : null;
}
