import { randomUUID } from "node:crypto";
import { isActiveHandoverEvent } from "./ownership-event-state.js";
import {
  ActiveHandoverError,
  UnassignedProductError,
} from "./ownership-event-write.service.js";
import type { OwnershipHandoverRepository } from "./ownership-handover.contracts.js";
import {
  MissingHandoverChainError,
  OwnershipStateConflictError,
} from "./ownership-handover.contracts.js";
import type {
  OwnershipEventRecord,
  OwnershipQueryService,
} from "./ownership-query.service.js";

export class OwnershipHandoverService {
  constructor(
    private readonly repository: OwnershipHandoverRepository,
    private readonly ownershipQueryService: OwnershipQueryService,
  ) {}

  async autoRevertExpiredHandovers(input: {
    endedBy: string;
    expiredBefore: Date;
    limit?: number;
    now?: Date;
  }): Promise<{ endedChainIds: string[] }> {
    const handoverChainIds =
      await this.repository.findExpiredActiveHandoverChainIds({
        expiredBefore: input.expiredBefore,
        ...(input.limit != null ? { limit: input.limit } : {}),
      });
    const endedChainIds: string[] = [];

    for (const handoverChainId of handoverChainIds) {
      const originalWorkerId =
        await this.repository.getOriginalWorkerForChain(handoverChainId);

      if (!originalWorkerId) {
        continue;
      }

      const result = await this.endHandover({
        endedBy: input.endedBy,
        handoverChainId,
        ...(input.now ? { now: input.now } : {}),
        originalWorkerId,
      });

      if (result.status === "created") {
        endedChainIds.push(handoverChainId);
      }
    }

    return { endedChainIds };
  }

  async chainHandover(input: {
    currentReceivingWorkerId: string;
    handoverChainId: string;
    initiatedBy: string;
    newWorkerId: string;
    now?: Date;
  }): Promise<{
    handoverInEvent: OwnershipEventRecord;
    handoverOutEvent: OwnershipEventRecord;
    status: "created";
  }> {
    const latestChainEvent = await this.requireLatestChainEvent(
      input.handoverChainId,
    );

    if (latestChainEvent.eventType !== "handover_in") {
      throw new OwnershipStateConflictError(
        "This handover chain is not currently in a transferable state.",
        {
          handoverChainId: input.handoverChainId,
          latestEventType: latestChainEvent.eventType,
        },
      );
    }

    if (latestChainEvent.workerId !== input.currentReceivingWorkerId) {
      throw new OwnershipStateConflictError(
        "The current receiving worker does not match the active handover owner.",
        {
          currentReceivingWorkerId: input.currentReceivingWorkerId,
          handoverChainId: input.handoverChainId,
          latestWorkerId: latestChainEvent.workerId,
        },
      );
    }

    const transition = await this.repository.insertHandoverPair({
      createdBy: input.initiatedBy,
      effectiveFrom: input.now ?? new Date(),
      fromWorkerId: input.currentReceivingWorkerId,
      handoverChainId: input.handoverChainId,
      locationId: latestChainEvent.locationId,
      skuId: latestChainEvent.skuId,
      quantity: latestChainEvent.quantity,
      toWorkerId: input.newWorkerId,
    });

    return {
      ...transition,
      status: "created",
    };
  }

  async endHandover(input: {
    endedBy: string;
    handoverChainId: string;
    now?: Date;
    originalWorkerId: string;
  }): Promise<{ event: OwnershipEventRecord; status: "created" | "noop" }> {
    const latestChainEvent = await this.requireLatestChainEvent(
      input.handoverChainId,
    );

    if (latestChainEvent.eventType === "reverted") {
      return {
        event: latestChainEvent,
        status: "noop",
      };
    }

    if (!isActiveHandoverEvent(latestChainEvent.eventType)) {
      throw new OwnershipStateConflictError(
        "This handover chain is already closed or in an invalid state.",
        {
          handoverChainId: input.handoverChainId,
          latestEventType: latestChainEvent.eventType,
        },
      );
    }

    const event = await this.repository.insertRevertedEvent({
      createdBy: input.endedBy,
      effectiveFrom: input.now ?? new Date(),
      handoverChainId: input.handoverChainId,
      locationId: latestChainEvent.locationId,
      skuId: latestChainEvent.skuId,
      quantity: latestChainEvent.quantity,
      workerId: input.originalWorkerId,
    });

    return {
      event,
      status: "created",
    };
  }

  async initiateHandover(input: {
    fromWorkerId: string;
    initiatedBy: string;
    locationId: string;
    now?: Date;
    skuId: string;
    toWorkerId: string;
  }): Promise<{
    handoverChainId: string;
    handoverInEvent: OwnershipEventRecord;
    handoverOutEvent: OwnershipEventRecord;
  }> {
    const currentEvent =
      await this.ownershipQueryService.getCurrentOwnershipEvent({
        locationId: input.locationId,
        ...(input.now ? { now: input.now } : {}),
        skuId: input.skuId,
      });

    if (!currentEvent || currentEvent.eventType === "cancelled") {
      throw new UnassignedProductError();
    }

    if (isActiveHandoverEvent(currentEvent.eventType)) {
      throw new ActiveHandoverError(currentEvent.handoverChainId);
    }

    if (currentEvent.workerId !== input.fromWorkerId) {
      throw new OwnershipStateConflictError(
        "The requested handover source does not match the current owner.",
        {
          currentWorkerId: currentEvent.workerId,
          requestedWorkerId: input.fromWorkerId,
        },
      );
    }

    const handoverChainId = randomUUID();
    const transition = await this.repository.insertHandoverPair({
      createdBy: input.initiatedBy,
      effectiveFrom: input.now ?? new Date(),
      fromWorkerId: input.fromWorkerId,
      handoverChainId,
      locationId: input.locationId,
      skuId: input.skuId,
      quantity: currentEvent.quantity,
      toWorkerId: input.toWorkerId,
    });

    return {
      handoverChainId,
      ...transition,
    };
  }

  private async requireLatestChainEvent(
    handoverChainId: string,
  ): Promise<OwnershipEventRecord> {
    const latestChainEvent =
      await this.repository.getLatestChainEvent(handoverChainId);

    if (!latestChainEvent) {
      throw new MissingHandoverChainError(handoverChainId);
    }

    return latestChainEvent;
  }
}
