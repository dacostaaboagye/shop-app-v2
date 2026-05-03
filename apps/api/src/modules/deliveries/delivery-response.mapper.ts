import type {
  DeliveryResponse,
  DeliveryTransitionResponse,
} from "@shop/contracts";
import type {
  DeliveryDestinationRecord,
  DeliveryRecord,
} from "./delivery.types.js";
import type { DeliveryTransitionResult } from "./delivery-status.contracts.js";

export function toDeliveryResponse(record: DeliveryRecord): DeliveryResponse {
  return {
    deliveryReference: record.deliveryReference,
    sourceType: record.sourceType,
    sourceReference: record.sourceReference,
    status: record.status,
    originLocationSlug: record.originLocationSlug,
    destination: mapDestination(record.destination),
    items: record.items.map((item) => ({
      itemReference: item.itemReference,
      sku: item.sku ?? "",
      quantity: item.quantity,
    })),
    assignedUserSlug: record.assignedUserSlug,
    assignedAt: record.assignedAt?.toISOString() ?? null,
    dispatchedAt: record.dispatchedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    cancellationReason: record.cancellationReason,
    createdAt: record.createdAt.toISOString(),
    createdByUserSlug: record.createdBySlug,
  };
}

export function toTransitionResponse(
  result: DeliveryTransitionResult,
): DeliveryTransitionResponse {
  return {
    delivery: toDeliveryResponse(result.delivery),
    status: result.status === "transitioned" ? "transitioned" : "noop",
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
  };
}

function mapDestination(
  destination: DeliveryDestinationRecord,
): DeliveryResponse["destination"] {
  if (destination.kind === "location") {
    return { kind: "location", locationSlug: destination.locationSlug ?? "" };
  }
  return { kind: "external", snapshot: destination.snapshot };
}
