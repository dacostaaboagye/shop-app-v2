export type SupplyRequestRow = {
  id: string;
  reference: string;
  requestGroupReference: string | null;
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
  receivedQuantity: number | null;
  receiptDiscrepancyReason: string | null;
  receiptDiscrepancyNotes: string | null;
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
  receivedQuantity: number | null;
  receiptDiscrepancyReason: string | null;
  receiptDiscrepancyNotes: string | null;
  notes: string | null;
  createdAt: Date;
};

type SkuSnapshot = { sku: string; productName: string; variantName: string };

export function toSupplyRequestRow(
  row: {
    id: string;
    reference: string;
    requestGroupReference?: string | null;
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
    receivedQuantity?: number | null;
    receiptDiscrepancyReason?: string | null;
    receiptDiscrepancyNotes?: string | null;
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
    receivedQuantity: row.receivedQuantity ?? null,
    reference: row.reference,
    receiptDiscrepancyNotes: row.receiptDiscrepancyNotes ?? null,
    receiptDiscrepancyReason: row.receiptDiscrepancyReason ?? null,
    requestGroupReference: row.requestGroupReference ?? null,
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
  receivedQuantity: number | null;
  receiptDiscrepancyReason: string | null;
  receiptDiscrepancyNotes: string | null;
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
    receivedQuantity: gtn.receivedQuantity,
    reference: gtn.reference,
    receiptDiscrepancyNotes: gtn.receiptDiscrepancyNotes,
    receiptDiscrepancyReason: gtn.receiptDiscrepancyReason,
    skuId: gtn.skuId,
    skuSnapshot: gtn.skuSnapshot as SkuSnapshot,
    sourceLocationId: gtn.sourceLocationId,
    sourceLocationName: gtn.sourceLocation?.name ?? null,
    status: gtn.status,
    supplyRequestId: gtn.supplyRequestId,
    supplyRequestReference: gtn.supplyRequest?.reference ?? "",
  };
}
