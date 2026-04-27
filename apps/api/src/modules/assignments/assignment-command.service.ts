import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type {
  OwnershipEventWriteService,
  OwnershipWriteResult,
} from "../inventory-ownership/ownership-event-write.service.js";
import type { OwnershipHandoverService } from "../inventory-ownership/ownership-handover.service.js";
import type { AssignmentEventContextRepository } from "./assignment-event-context.repository.js";
import {
  createAssignmentAssignedEvent,
  createAssignmentHandoverRevertedEvent,
  createAssignmentHandoverStartedEvent,
  createAssignmentReassignedEvent,
} from "./assignment-events.js";

type AuthenticatedAssignmentActor = {
  userId: string;
  userSlug: string;
};

export class AssignmentCommandService {
  constructor(
    private readonly ownershipEventWriteService: Pick<
      OwnershipEventWriteService,
      "assignProduct" | "reassignProduct"
    >,
    private readonly ownershipHandoverService: Pick<
      OwnershipHandoverService,
      "endHandover" | "initiateHandover"
    >,
    private readonly contextRepository: AssignmentEventContextRepository,
    private readonly eventPublisher: PlatformEventPublisher | null = null,
  ) {}

  async assignProduct(input: {
    actor: AuthenticatedAssignmentActor;
    locationId: string;
    now?: Date;
    quantity: number;
    skuId: string;
    workerId: string;
  }) {
    const result = await this.ownershipEventWriteService.assignProduct({
      assignedBy: input.actor.userId,
      locationId: input.locationId,
      ...(input.now ? { now: input.now } : {}),
      quantity: input.quantity,
      skuId: input.skuId,
      workerId: input.workerId,
    });

    await this.publishAssignmentWriteEvent({
      actor: input.actor,
      result,
      type: "assigned",
    });

    return result;
  }

  async reassignProduct(input: {
    actor: AuthenticatedAssignmentActor;
    locationId: string;
    newWorkerId: string;
    now?: Date;
    quantity?: number;
    skuId: string;
  }) {
    const result = await this.ownershipEventWriteService.reassignProduct({
      locationId: input.locationId,
      newWorkerId: input.newWorkerId,
      ...(input.now ? { now: input.now } : {}),
      ...(input.quantity != null ? { quantity: input.quantity } : {}),
      reassignedBy: input.actor.userId,
      skuId: input.skuId,
    });

    await this.publishAssignmentWriteEvent({
      actor: input.actor,
      result,
      type: "reassigned",
    });

    return result;
  }

  async initiateHandover(input: {
    actor: AuthenticatedAssignmentActor;
    fromWorkerId: string;
    locationId: string;
    now?: Date;
    skuId: string;
    toWorkerId: string;
  }) {
    const result = await this.ownershipHandoverService.initiateHandover({
      fromWorkerId: input.fromWorkerId,
      initiatedBy: input.actor.userId,
      locationId: input.locationId,
      ...(input.now ? { now: input.now } : {}),
      skuId: input.skuId,
      toWorkerId: input.toWorkerId,
    });

    const handoverInContext =
      await this.contextRepository.getAssignmentEventContext({
        locationId: result.handoverInEvent.locationId,
        quantity: result.handoverInEvent.quantity,
        skuId: result.handoverInEvent.skuId,
        workerId: result.handoverInEvent.workerId,
      });
    const fromWorkerName = await this.contextRepository.getWorkerName(
      input.fromWorkerId,
    );

    await this.eventPublisher?.publish(
      createAssignmentHandoverStartedEvent({
        actor: input.actor,
        fromWorkerName,
        handoverChainId: result.handoverChainId,
        handoverInContext,
        occurredAt: result.handoverOutEvent.createdAt,
      }),
    );

    return result;
  }

  async endHandover(input: {
    actor: AuthenticatedAssignmentActor;
    handoverChainId: string;
    now?: Date;
    originalWorkerId: string;
  }) {
    const result = await this.ownershipHandoverService.endHandover({
      endedBy: input.actor.userId,
      handoverChainId: input.handoverChainId,
      ...(input.now ? { now: input.now } : {}),
      originalWorkerId: input.originalWorkerId,
    });

    if (result.status === "created") {
      const context = await this.contextRepository.getAssignmentEventContext({
        locationId: result.event.locationId,
        quantity: result.event.quantity,
        skuId: result.event.skuId,
        workerId: result.event.workerId,
      });

      await this.eventPublisher?.publish(
        createAssignmentHandoverRevertedEvent({
          actor: input.actor,
          context,
          handoverChainId: input.handoverChainId,
          occurredAt: result.event.createdAt,
        }),
      );
    }

    return result;
  }

  private async publishAssignmentWriteEvent(input: {
    actor: AuthenticatedAssignmentActor;
    result: OwnershipWriteResult;
    type: "assigned" | "reassigned";
  }) {
    if (input.result.status !== "created") {
      return;
    }

    const context = await this.contextRepository.getAssignmentEventContext({
      locationId: input.result.event.locationId,
      quantity: input.result.event.quantity,
      skuId: input.result.event.skuId,
      workerId: input.result.event.workerId,
    });

    await this.eventPublisher?.publish(
      input.type === "assigned"
        ? createAssignmentAssignedEvent({
            actor: input.actor,
            context,
            occurredAt: input.result.event.createdAt,
          })
        : createAssignmentReassignedEvent({
            actor: input.actor,
            context,
            occurredAt: input.result.event.createdAt,
          }),
    );
  }
}
