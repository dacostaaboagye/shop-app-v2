import type { deliveries, deliveryItems } from "@shop/database";
import type {
  DeliveryDestinationRecord,
  DeliveryItemRecord,
  DeliveryRecord,
} from "./delivery.types.js";

type DeliveryRow = typeof deliveries.$inferSelect;
type DeliveryItemRow = typeof deliveryItems.$inferSelect;

export function mapDeliveryRow(
  row: DeliveryRow,
  items: DeliveryItemRecord[],
): DeliveryRecord {
  return {
    deliveryId: row.id,
    sourceType: row.sourceType,
    sourceReference: row.sourceReference,
    status: row.status,
    originLocationId: row.originLocationId,
    destination: mapDestination(row),
    items,
    assignedUserId: row.assignedUserId,
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
  };
}

export function mapDeliveryItemRow(row: DeliveryItemRow): DeliveryItemRecord {
  return {
    deliveryItemId: row.id,
    itemReference: row.itemReference,
    skuId: row.skuId,
    quantity: row.quantity,
  };
}

function mapDestination(row: DeliveryRow): DeliveryDestinationRecord {
  if (row.destinationKind === "location" && row.destinationLocationId) {
    return { kind: "location", locationId: row.destinationLocationId };
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
