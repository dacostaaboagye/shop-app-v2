import { randomUUID } from "node:crypto";
import {
  DELIVERY_STATUS_CHANGED_EVENT_TYPE,
  type DeliveryStatus,
} from "@shop/contracts";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

/**
 * Records a single delivery status transition. Targets the delivery's
 * origin location so location-scoped subscribers (managers, the
 * agent portal in E-15) see it. The actor is the user who triggered
 * the transition — for system flows the system user uuid.
 */
export function createDeliveryStatusChangedEvent(input: {
  deliveryReference: string;
  fromStatus: DeliveryStatus;
  toStatus: DeliveryStatus;
  originLocationId: string;
  actorUserSlug: string;
  occurredAt: Date;
  cancellationReason?: string | null;
  assignedUserSlug?: string | null;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actorUserSlug },
    audience: [
      {
        kind: "permission",
        locationId: input.originLocationId,
        permission: "inventory.read",
      },
    ],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      deliveryReference: input.deliveryReference,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserSlug: input.actorUserSlug,
      assignedUserSlug: input.assignedUserSlug ?? null,
      cancellationReason: input.cancellationReason ?? null,
    },
    resource: {
      kind: "delivery",
      reference: input.deliveryReference,
    },
    summary: `Delivery moved from "${input.fromStatus}" to "${input.toStatus}".`,
    type: DELIVERY_STATUS_CHANGED_EVENT_TYPE,
  };
}
