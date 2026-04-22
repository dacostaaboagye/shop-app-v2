import { randomUUID } from "node:crypto";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type {
  PlatformEventPublisher,
  PlatformEventRecord,
} from "../events/platform-event.types.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import { formatStockSupplyEventSummary } from "./stock-supply-event-summary.js";

export class StockSupplyEventPublisher {
  constructor(private readonly eventPublisher: PlatformEventPublisher) {}

  async publishRequested(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "requested",
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.requested",
      }),
    );
  }

  async publishCancelled(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "cancelled",
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.cancelled",
      }),
    );
  }

  async publishApproved(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "approved",
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.approved",
      }),
    );
  }

  async publishRejected(input: {
    actor: AuthenticatedActor;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "rejected",
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.rejected",
      }),
    );
  }

  async publishDispatched(input: {
    actor: AuthenticatedActor;
    gtn: GtnRow;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        payload: {
          gtnReference: input.gtn.reference,
        },
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "dispatched",
          gtnReference: input.gtn.reference,
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.dispatched",
      }),
    );
  }

  async publishReceived(input: {
    actor: AuthenticatedActor;
    gtn: GtnRow;
    supplyRequest: SupplyRequestRow;
  }) {
    await this.eventPublisher.publish(
      createStockSupplyEvent({
        actor: input.actor,
        payload: {
          gtnReference: input.gtn.reference,
        },
        supplyRequest: input.supplyRequest,
        summary: formatStockSupplyEventSummary({
          action: "received",
          gtnReference: input.gtn.reference,
          supplyRequest: input.supplyRequest,
        }),
        type: "transfer.received",
      }),
    );
  }
}

export function createStockSupplyEvent(input: {
  actor: AuthenticatedActor;
  payload?: Record<string, string | number | boolean | null>;
  summary: string;
  supplyRequest: SupplyRequestRow;
  type: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      { kind: "user", userId: input.supplyRequest.requesterId },
      {
        kind: "permission",
        locationId: input.supplyRequest.sourceLocationId,
        permission: "stock.supply.manage",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    payload: {
      approvedQuantity: input.supplyRequest.approvedQuantity,
      destinationLocationName: input.supplyRequest.locationName,
      requestedQuantity: input.supplyRequest.requestedQuantity,
      sourceLocationName: input.supplyRequest.sourceLocationName,
      status: input.supplyRequest.status,
      ...input.payload,
    },
    resource: {
      kind: "stock_transfer_request",
      reference: input.supplyRequest.reference,
    },
    summary: input.summary,
    type: input.type,
  };
}
