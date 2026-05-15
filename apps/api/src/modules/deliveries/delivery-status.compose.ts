import type { DeliveryAgentEligibilityPort } from "@shop/contracts";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import type {
  AssignDeliveryInput,
  CancelDeliveryInput,
  CompleteDeliveryInput,
  DeliveryTransitionResult,
  DispatchDeliveryInput,
  ReassignDeliveryInput,
} from "./delivery-status.contracts.js";
import {
  DeliveryAgentNotEligibleError,
  DeliveryAssignmentRequiredError,
  DeliveryCancellationReasonRequiredError,
  DeliveryReassignmentNotAllowedError,
  DeliveryStatusConflictError,
} from "./delivery-status.errors.js";
import type { DeliveryStatusEventPublisher } from "./delivery-status-event-publisher.js";
import {
  appendStatusChangedEvent,
  notifyDeliveryStatusEventCommitted,
} from "./delivery-status-event-publisher.js";
import { DeliveryStatusTransitionRunner } from "./delivery-status-transition-runner.js";
import type { DeliveryStatusWriteRepository } from "./postgres-delivery-status-write.repository.js";

export type DeliveryStatusComposeDeps = {
  repository: DeliveryStatusWriteRepository;
  agentEligibilityPort: DeliveryAgentEligibilityPort;
  platformEventPublisher?: DeliveryStatusEventPublisher;
  logger?: {
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
};

export class DeliveryStatusCompose {
  private readonly transitionRunner: DeliveryStatusTransitionRunner;

  constructor(private readonly deps: DeliveryStatusComposeDeps) {
    this.transitionRunner = new DeliveryStatusTransitionRunner(this.deps);
  }

  async assign(input: AssignDeliveryInput): Promise<DeliveryTransitionResult> {
    if (!input.assignedUserId) {
      throw new DeliveryAssignmentRequiredError({
        deliveryId: input.deliveryId,
      });
    }
    return this.transitionRunner.transition({
      deliveryId: input.deliveryId,
      nextStatus: "assigned",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      assignedUserId: input.assignedUserId,
      isIdempotent: (current) =>
        current.status === "assigned" &&
        current.assignedUserId === input.assignedUserId,
      eligibilityCheck: async (current) => {
        const eligible = await this.deps.agentEligibilityPort.isEligibleAgent({
          userId: input.assignedUserId,
          locationId: current.originLocationId,
        });
        if (!eligible) {
          throw new DeliveryAgentNotEligibleError({
            deliveryId: input.deliveryId,
            userId: input.assignedUserId,
          });
        }
      },
    });
  }

  async reassign(
    input: ReassignDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    if (!input.assignedUserId) {
      throw new DeliveryAssignmentRequiredError({
        deliveryId: input.deliveryId,
      });
    }
    const now = input.now ?? new Date();
    const result = await this.deps.repository.withTransaction(async (tx) => {
      const current = await tx.findById(input.deliveryId);
      if (!current) {
        throw new DeliverySourceNotFoundError({
          sourceType: "delivery",
          sourceReference: input.deliveryId,
        });
      }
      if (current.status !== "assigned") {
        throw new DeliveryReassignmentNotAllowedError({
          deliveryId: input.deliveryId,
          currentStatus: current.status,
        });
      }
      if (current.assignedUserId === input.assignedUserId) {
        return {
          delivery: current,
          status: "noop" as const,
          fromStatus: current.status,
          toStatus: current.status,
        };
      }
      const eligible = await this.deps.agentEligibilityPort.isEligibleAgent({
        userId: input.assignedUserId,
        locationId: current.originLocationId,
      });
      if (!eligible) {
        throw new DeliveryAgentNotEligibleError({
          deliveryId: input.deliveryId,
          userId: input.assignedUserId,
        });
      }
      const updated = await tx.transitionStatus({
        deliveryId: input.deliveryId,
        expectedStatus: "assigned",
        nextStatus: "assigned",
        assignedUserId: input.assignedUserId,
        eligibleAgentLocationId: current.originLocationId,
        actorUserId: input.actorUserId,
        now,
      });
      if (!updated) {
        const fresh = await tx.findById(input.deliveryId);
        if (
          fresh?.status === current.status &&
          fresh.originLocationId === current.originLocationId
        ) {
          throw new DeliveryAgentNotEligibleError({
            deliveryId: input.deliveryId,
            userId: input.assignedUserId,
          });
        }
        throw new DeliveryStatusConflictError({
          deliveryId: input.deliveryId,
          expectedStatus: "assigned",
          observedStatus: fresh?.status ?? null,
        });
      }
      const result = {
        delivery: updated,
        status: "transitioned" as const,
        fromStatus: "assigned" as const,
        toStatus: "assigned" as const,
      };
      await appendStatusChangedEvent({
        tx,
        publisher: this.deps.platformEventPublisher,
        event: {
          deliveryReference: result.delivery.deliveryReference,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus,
          originLocationId: result.delivery.originLocationId,
          actorUserSlug: input.actorUserSlug,
          occurredAt: now,
          assignedUserSlug: result.delivery.assignedUserSlug,
        },
      });
      return result;
    });

    if (result.status === "transitioned") {
      await notifyDeliveryStatusEventCommitted({
        publisher: this.deps.platformEventPublisher,
        logger: this.deps.logger,
        event: {
          deliveryReference: result.delivery.deliveryReference,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus,
        },
      });
    }
    return result;
  }

  async dispatch(
    input: DispatchDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.transitionRunner.transition({
      deliveryId: input.deliveryId,
      nextStatus: "in_transit",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      isIdempotent: (current) => current.status === "in_transit",
    });
  }

  async complete(
    input: CompleteDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.transitionRunner.transition({
      deliveryId: input.deliveryId,
      nextStatus: "completed",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      isIdempotent: (current) => current.status === "completed",
    });
  }

  async cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new DeliveryCancellationReasonRequiredError({
        deliveryId: input.deliveryId,
      });
    }
    return this.transitionRunner.transition({
      deliveryId: input.deliveryId,
      nextStatus: "cancelled",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      cancellationReason: reason,
      isIdempotent: (current) =>
        current.status === "cancelled" && current.cancellationReason === reason,
    });
  }
}
