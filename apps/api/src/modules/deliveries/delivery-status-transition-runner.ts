import type { DeliveryStatus } from "@shop/contracts";
import type { DeliveryRecord } from "./delivery.types.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import type { DeliveryTransitionResult } from "./delivery-status.contracts.js";
import {
  DeliveryIllegalStatusTransitionError,
  DeliveryStatusConflictError,
  DeliveryTerminalStatusError,
} from "./delivery-status.errors.js";
import type { DeliveryStatusEventPublisher } from "./delivery-status-event-publisher.js";
import {
  appendStatusChangedEvent,
  notifyDeliveryStatusEventCommitted,
} from "./delivery-status-event-publisher.js";
import { canTransition } from "./delivery-status-transition.policy.js";
import type {
  DeliveryStatusWriteRepository,
  DeliveryStatusWriteTransaction,
} from "./postgres-delivery-status-write.repository.js";

type DeliveryStatusTransitionRunnerDeps = {
  repository: DeliveryStatusWriteRepository;
  platformEventPublisher?: DeliveryStatusEventPublisher;
  logger?: {
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
};

export class DeliveryStatusTransitionRunner {
  constructor(private readonly deps: DeliveryStatusTransitionRunnerDeps) {}

  async transition(input: {
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
      const updated = await tx.transitionStatus(
        buildTransitionParams(input, current, now),
      );
      if (!updated) {
        const fresh = await tx.findById(input.deliveryId);
        throw new DeliveryStatusConflictError({
          deliveryId: input.deliveryId,
          expectedStatus: current.status,
          observedStatus: fresh?.status ?? null,
        });
      }
      const transitionResult = {
        delivery: updated,
        status: "transitioned" as const,
        fromStatus: current.status,
        toStatus: input.nextStatus,
      };
      await this.appendEvent(tx, input, transitionResult, now);
      return transitionResult;
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

  private async appendEvent(
    tx: DeliveryStatusWriteTransaction,
    input: {
      deliveryId: string;
      actorUserSlug: string;
      assignedUserId?: string;
      cancellationReason?: string;
    },
    result: DeliveryTransitionResult,
    occurredAt: Date,
  ): Promise<void> {
    await appendStatusChangedEvent({
      tx,
      publisher: this.deps.platformEventPublisher,
      event: {
        deliveryReference: result.delivery.deliveryReference,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
        originLocationId: result.delivery.originLocationId,
        actorUserSlug: input.actorUserSlug,
        occurredAt,
        cancellationReason: input.cancellationReason ?? null,
        assignedUserSlug: result.delivery.assignedUserSlug,
      },
    });
  }
}

function buildTransitionParams(
  input: {
    deliveryId: string;
    nextStatus: DeliveryStatus;
    actorUserId: string;
    assignedUserId?: string;
    cancellationReason?: string;
  },
  current: DeliveryRecord,
  now: Date,
): Parameters<DeliveryStatusWriteTransaction["transitionStatus"]>[0] {
  const params: Parameters<
    DeliveryStatusWriteTransaction["transitionStatus"]
  >[0] = {
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
  return params;
}
