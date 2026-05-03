import type {
  DeliveryAgentEligibilityPort,
  DeliveryStatus,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { DeliveryRecord } from "./delivery.types.js";
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
  DeliveryIllegalStatusTransitionError,
  DeliveryReassignmentNotAllowedError,
  DeliveryStatusConflictError,
  DeliveryTerminalStatusError,
} from "./delivery-status.errors.js";
import { createDeliveryStatusChangedEvent } from "./delivery-status-events.js";
import { canTransition } from "./delivery-status-transition.policy.js";
import type { DeliveryStatusWriteRepository } from "./postgres-delivery-status-write.repository.js";

export type DeliveryStatusComposeDeps = {
  repository: DeliveryStatusWriteRepository;
  agentEligibilityPort: DeliveryAgentEligibilityPort;
  platformEventPublisher?: Pick<PlatformEventPublisher, "publish">;
};

export class DeliveryStatusCompose {
  constructor(private readonly deps: DeliveryStatusComposeDeps) {}

  async assign(input: AssignDeliveryInput): Promise<DeliveryTransitionResult> {
    if (!input.assignedUserId) {
      throw new DeliveryAssignmentRequiredError({
        deliveryId: input.deliveryId,
      });
    }
    return this.transition({
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
      const now = input.now ?? new Date();
      const updated = await tx.transitionStatus({
        deliveryId: input.deliveryId,
        expectedStatus: "assigned",
        nextStatus: "assigned",
        assignedUserId: input.assignedUserId,
        actorUserId: input.actorUserId,
        now,
      });
      if (!updated) {
        const fresh = await tx.findById(input.deliveryId);
        throw new DeliveryStatusConflictError({
          deliveryId: input.deliveryId,
          expectedStatus: "assigned",
          observedStatus: fresh?.status ?? null,
        });
      }
      return {
        delivery: updated,
        status: "transitioned" as const,
        fromStatus: "assigned" as const,
        toStatus: "assigned" as const,
      };
    });

    if (result.status === "transitioned" && this.deps.platformEventPublisher) {
      await this.deps.platformEventPublisher.publish(
        createDeliveryStatusChangedEvent({
          deliveryId: input.deliveryId,
          fromStatus: "assigned",
          toStatus: "assigned",
          originLocationId: result.delivery.originLocationId,
          actorUserId: input.actorUserId,
          actorUserSlug: input.actorUserSlug,
          occurredAt: input.now ?? new Date(),
          assignedUserId: input.assignedUserId,
        }),
      );
    }
    return result;
  }

  async dispatch(
    input: DispatchDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.transition({
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
    return this.transition({
      deliveryId: input.deliveryId,
      nextStatus: "completed",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      isIdempotent: (current) => current.status === "completed",
    });
  }

  async cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult> {
    return this.transition({
      deliveryId: input.deliveryId,
      nextStatus: "cancelled",
      actorUserId: input.actorUserId,
      actorUserSlug: input.actorUserSlug,
      now: input.now,
      cancellationReason: input.reason,
      isIdempotent: (current) =>
        current.status === "cancelled" &&
        current.cancellationReason === input.reason,
    });
  }

  private async transition(input: {
    deliveryId: string;
    nextStatus: DeliveryStatus;
    actorUserId: string;
    actorUserSlug: string;
    now: Date | undefined;
    assignedUserId?: string;
    cancellationReason?: string;
    isIdempotent: (current: DeliveryRecord) => boolean;
    eligibilityCheck?: (current: DeliveryRecord) => Promise<void>;
  }): Promise<DeliveryTransitionResult> {
    const now = input.now ?? new Date();
    const result = await this.deps.repository.withTransaction(async (tx) => {
      const current = await tx.findById(input.deliveryId);
      if (!current) {
        throw new DeliverySourceNotFoundError({
          sourceType: "delivery",
          sourceReference: input.deliveryId,
        });
      }
      if (input.isIdempotent(current)) {
        return {
          delivery: current,
          status: "noop" as const,
          fromStatus: current.status,
          toStatus: current.status,
        };
      }
      if (input.eligibilityCheck) {
        await input.eligibilityCheck(current);
      }
      const verdict = canTransition(current.status, input.nextStatus);
      if (!verdict.allowed) {
        if (verdict.reason === "terminal_state") {
          throw new DeliveryTerminalStatusError({
            deliveryId: input.deliveryId,
            currentStatus: current.status,
          });
        }
        throw new DeliveryIllegalStatusTransitionError({
          deliveryId: input.deliveryId,
          from: current.status,
          to: input.nextStatus,
        });
      }
      const params: Parameters<typeof tx.transitionStatus>[0] = {
        deliveryId: input.deliveryId,
        expectedStatus: current.status,
        nextStatus: input.nextStatus,
        actorUserId: input.actorUserId,
        now,
      };
      if (input.assignedUserId !== undefined) {
        params.assignedUserId = input.assignedUserId;
      }
      if (input.cancellationReason !== undefined) {
        params.cancellationReason = input.cancellationReason;
      }
      const updated = await tx.transitionStatus(params);
      if (!updated) {
        const fresh = await tx.findById(input.deliveryId);
        throw new DeliveryStatusConflictError({
          deliveryId: input.deliveryId,
          expectedStatus: current.status,
          observedStatus: fresh?.status ?? null,
        });
      }
      return {
        delivery: updated,
        status: "transitioned" as const,
        fromStatus: current.status,
        toStatus: input.nextStatus,
      };
    });

    if (result.status === "transitioned" && this.deps.platformEventPublisher) {
      await this.deps.platformEventPublisher.publish(
        createDeliveryStatusChangedEvent({
          deliveryId: input.deliveryId,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus,
          originLocationId: result.delivery.originLocationId,
          actorUserId: input.actorUserId,
          actorUserSlug: input.actorUserSlug,
          occurredAt: now,
          cancellationReason: input.cancellationReason ?? null,
          assignedUserId: input.assignedUserId ?? null,
        }),
      );
    }
    return result;
  }
}
