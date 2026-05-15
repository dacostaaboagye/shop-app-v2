import type { deliveries, deliveryItems } from "@shop/database";
import type {
  DeliveryDestinationRecord,
  DeliveryItemRecord,
  DeliveryRecord,
} from "./delivery.types.js";

type DeliveryRow = typeof deliveries.$inferSelect;
type DeliveryItemRow = typeof deliveryItems.$inferSelect;
type DeliveryPublicFields = {
  assignedUserSlug?: string | null;
  createdBySlug?: string;
  destinationLocationSlug?: string | null;
  originLocationSlug?: string;
};
type DeliveryItemPublicFields = {
  sku?: string;
};

export function mapDeliveryRow(
  row: DeliveryRow & DeliveryPublicFields,
  items: DeliveryItemRecord[],
): DeliveryRecord {
  return {
    deliveryId: row.id,
    deliveryReference: row.reference,
    sourceType: row.sourceType,
    sourceReference: row.sourceReference,
    status: row.status,
    originLocationId: row.originLocationId,
    originLocationSlug: row.originLocationSlug ?? "",
    destination: mapDestination(row),
    items,
    assignedUserId: row.assignedUserId,
    assignedUserSlug: row.assignedUserSlug ?? null,
    assignedAt: row.assignedAt,
    assignedBy: row.assignedBy,
    dispatchedAt: row.dispatchedAt,
    dispatchedBy: row.dispatchedBy,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    createdBySlug: row.createdBySlug ?? "",
  };
}

export function mapDeliveryItemRow(
  row: DeliveryItemRow & DeliveryItemPublicFields,
): DeliveryItemRecord {
  return {
    deliveryItemId: row.id,
    itemReference: row.itemReference,
    skuId: row.skuId,
    sku: row.sku ?? "",
    quantity: row.quantity,
  };
}

function mapDestination(
  row: DeliveryRow & DeliveryPublicFields,
): DeliveryDestinationRecord {
  if (row.destinationKind === "location" && row.destinationLocationId) {
    return {
      kind: "location",
      locationId: row.destinationLocationId,
      locationSlug: row.destinationLocationSlug ?? "",
    };
  }
  if (row.destinationKind === "external" && row.destinationSnapshot) {
    return {
      kind: "external",
      snapshot: row.destinationSnapshot as DeliveryDestinationRecord extends {
        kind: "external";
        snapshot: infer S;
      }
        ? S
        : never,
    };
  }
  throw new Error(
    `Delivery row ${row.id} has inconsistent destination state (kind=${row.destinationKind}).`,
  );
}
