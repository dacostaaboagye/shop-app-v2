import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import type {
  AssignDeliveryInput,
  CancelDeliveryInput,
  CompleteDeliveryInput,
  DeliveryTransitionResult,
  DispatchDeliveryInput,
} from "./delivery-status.contracts.js";
import {
  DeliveryAssignmentRequiredError,
  DeliveryIllegalStatusTransitionError,
  DeliveryStatusConflictError,
  DeliveryTerminalStatusError,
} from "./delivery-status.errors.js";
import { canTransition } from "./delivery-status-transition.policy.js";
import type { DeliveryStatusWriteRepository } from "./postgres-delivery-status-write.repository.js";

export type DeliveryStatusComposeDeps = {
  repository: DeliveryStatusWriteRepository;
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
      now: input.now,
      assignedUserId: input.assignedUserId,
      isIdempotent: (current) =>
        current.status === "assigned" &&
        current.assignedUserId === input.assignedUserId,
    });
  }

  async dispatch(
    input: DispatchDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.transition({
      deliveryId: input.deliveryId,
      nextStatus: "in_transit",
      actorUserId: input.actorUserId,
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
      now: input.now,
      isIdempotent: (current) => current.status === "completed",
    });
  }

  async cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult> {
    return this.transition({
      deliveryId: input.deliveryId,
      nextStatus: "cancelled",
      actorUserId: input.actorUserId,
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
    now: Date | undefined;
    assignedUserId?: string;
    cancellationReason?: string;
    isIdempotent: (current: DeliveryRecord) => boolean;
  }): Promise<DeliveryTransitionResult> {
    const now = input.now ?? new Date();
    return this.deps.repository.withTransaction(async (tx) => {
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
  }
}
