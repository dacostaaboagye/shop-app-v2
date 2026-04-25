import { goodsTransferNotes, stockTransfers } from "@shop/database";
import { inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type SupplyRequestRow = {
  id: string;
  reference: string;
  transferReference: string | null;
  sourceReservationStatus:
    | "active"
    | "cancelled"
    | "confirmed"
    | "expired"
    | "released"
    | null;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  locationId: string;
  locationName: string | null;
  sourceLocationId: string;
  sourceLocationName: string | null;
  skuId: string;
  skuSnapshot: { sku: string; productName: string; variantName: string };
  requestedQuantity: number;
  approvedQuantity: number | null;
  status: string;
  notes: string | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  dispatchedBy: string | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  gtnReference: string | null;
  createdAt: Date;
};

export type GtnRow = {
  id: string;
  reference: string;
  supplyRequestId: string;
  supplyRequestReference: string;
  sourceLocationId: string;
  sourceLocationName: string | null;
  destinationLocationId: string;
  destinationLocationName: string | null;
  skuId: string;
  skuSnapshot: { sku: string; productName: string; variantName: string };
  quantity: number;
  status: string;
  dispatchedBy: string;
  dispatchedByName: string | null;
  dispatchedAt: Date;
  receivedBy: string | null;
  receivedByName: string | null;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

type SkuSnapshot = { sku: string; productName: string; variantName: string };

export function toSupplyRequestRow(
  row: {
    id: string;
    reference: string;
    requesterId: string;
    locationId: string;
    sourceLocationId: string;
    skuId: string;
    skuSnapshot: unknown;
    requestedQuantity: number;
    approvedQuantity?: number | null;
    status: string;
    notes: string | null;
    resolutionNotes: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    dispatchedBy?: string | null;
    dispatchedAt?: Date | null;
    receivedAt?: Date | null;
    createdAt: Date;
  },
  requesterName: string | null,
  requesterEmail: string | null,
  locationName: string | null,
  sourceLocationName: string | null,
  transferReference: string | null,
  sourceReservationStatus:
    | "active"
    | "cancelled"
    | "confirmed"
    | "expired"
    | "released"
    | null,
  gtnReference: string | null,
): SupplyRequestRow {
  return {
    approvedQuantity: row.approvedQuantity ?? null,
    createdAt: row.createdAt,
    dispatchedAt: row.dispatchedAt ?? null,
    dispatchedBy: row.dispatchedBy ?? null,
    gtnReference,
    id: row.id,
    locationId: row.locationId,
    locationName,
    notes: row.notes,
    receivedAt: row.receivedAt ?? null,
    reference: row.reference,
    sourceReservationStatus,
    transferReference,
    requesterEmail,
    requesterId: row.requesterId,
    requesterName,
    requestedQuantity: row.requestedQuantity,
    resolutionNotes: row.resolutionNotes,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot as SkuSnapshot,
    sourceLocationId: row.sourceLocationId,
    sourceLocationName,
    status: row.status,
  };
}

export function toGtnRow(gtn: {
  id: string;
  reference: string;
  supplyRequestId: string;
  skuId: string;
  skuSnapshot: unknown;
  quantity: number;
  status: string;
  dispatchedBy: string;
  dispatchedAt: Date;
  receivedBy: string | null;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  sourceLocationId: string;
  destinationLocationId: string;
  supplyRequest: { reference: string } | null;
  sourceLocation: { name: string } | null;
  destinationLocation: { name: string } | null;
  dispatchedByUser: { firstName: string; lastName: string } | null;
  receivedByUser: { firstName: string; lastName: string } | null;
}): GtnRow {
  return {
    createdAt: gtn.createdAt,
    destinationLocationId: gtn.destinationLocationId,
    destinationLocationName: gtn.destinationLocation?.name ?? null,
    dispatchedAt: gtn.dispatchedAt,
    dispatchedBy: gtn.dispatchedBy,
    dispatchedByName: gtn.dispatchedByUser
      ? `${gtn.dispatchedByUser.firstName} ${gtn.dispatchedByUser.lastName}`.trim()
      : null,
    id: gtn.id,
    notes: gtn.notes,
    quantity: gtn.quantity,
    receivedAt: gtn.receivedAt,
    receivedBy: gtn.receivedBy,
    receivedByName: gtn.receivedByUser
      ? `${gtn.receivedByUser.firstName} ${gtn.receivedByUser.lastName}`.trim()
      : null,
    reference: gtn.reference,
    skuId: gtn.skuId,
    skuSnapshot: gtn.skuSnapshot as SkuSnapshot,
    sourceLocationId: gtn.sourceLocationId,
    sourceLocationName: gtn.sourceLocation?.name ?? null,
    status: gtn.status,
    supplyRequestId: gtn.supplyRequestId,
    supplyRequestReference: gtn.supplyRequest?.reference ?? "",
  };
}

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
  if (supplyRequestIds.length === 0) {
    return new Map();
  }

  const rows = await db.query.stockReservations.findMany({
    columns: {
      sourceKey: true,
      status: true,
      updatedAt: true,
    },
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    where: (table, { and, eq, inArray }) =>
      and(
        eq(table.sourceType, "supply_request"),
        inArray(table.sourceKey, supplyRequestIds),
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
