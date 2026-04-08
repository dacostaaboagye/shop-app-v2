import { AppError } from "../_core/errors/app-error.js";
import { isActiveHandoverEvent } from "./ownership-event-state.js";
import type {
  OwnershipEventRecord,
  OwnershipQueryService,
} from "./ownership-query.service.js";

type InsertOwnershipEventInput = {
  createdBy: string;
  effectiveFrom: Date;
  eventType: "assigned" | "reassigned";
  handoverChainId: string | null;
  locationId: string;
  skuId: string;
  quantity: number;
  workerId: string;
};

export interface OwnershipEventWriteRepository {
  insertOwnershipEvent(
    input: InsertOwnershipEventInput,
  ): Promise<OwnershipEventRecord>;
}

export type OwnershipWriteResult = {
  event: OwnershipEventRecord;
  status: "created" | "noop";
};

export class ActiveHandoverError extends AppError {
  constructor(handoverChainId: string | null) {
    super({
      code: "conflict",
      detail: "This SKU cannot be reassigned while a handover is in progress.",
      ...(handoverChainId ? { details: { handoverChainId } } : {}),
      statusCode: 409,
      title: "Active handover",
    });
  }
}

export class AlreadyAssignedError extends AppError {
  constructor(currentWorkerId: string) {
    super({
      code: "conflict",
      detail:
        "This SKU is already assigned to another worker. Use reassignment instead.",
      details: { currentWorkerId },
      statusCode: 409,
      title: "SKU already assigned",
    });
  }
}

export class UnassignedProductError extends AppError {
  constructor() {
    super({
      code: "conflict",
      detail:
        "This SKU is currently unassigned. Use assignProduct to create the first assignment.",
      statusCode: 409,
      title: "SKU is unassigned",
    });
  }
}

export class OwnershipEventWriteService {
  constructor(
    private readonly repository: OwnershipEventWriteRepository,
    private readonly ownershipQueryService: OwnershipQueryService,
  ) {}

  async assignProduct(input: {
    assignedBy: string;
    locationId: string;
    now?: Date;
    skuId: string;
    quantity?: number;
    workerId: string;
  }): Promise<OwnershipWriteResult> {
    const currentEvent =
      await this.ownershipQueryService.getCurrentOwnershipEvent({
        locationId: input.locationId,
        ...(input.now ? { now: input.now } : {}),
        skuId: input.skuId,
      });

    if (!currentEvent || currentEvent.eventType === "cancelled") {
      return {
        event: await this.insertEvent({
          createdBy: input.assignedBy,
          eventType: "assigned",
          locationId: input.locationId,
          ...(input.now ? { now: input.now } : {}),
          skuId: input.skuId,
          ...(input.quantity != null ? { quantity: input.quantity } : {}),
          workerId: input.workerId,
        }),
        status: "created",
      };
    }

    if (isActiveHandoverEvent(currentEvent.eventType)) {
      throw new ActiveHandoverError(currentEvent.handoverChainId);
    }

    if (currentEvent.workerId === input.workerId) {
      return {
        event: currentEvent,
        status: "noop",
      };
    }

    throw new AlreadyAssignedError(currentEvent.workerId);
  }

  async reassignProduct(input: {
    locationId: string;
    newWorkerId: string;
    now?: Date;
    skuId: string;
    quantity?: number;
    reassignedBy: string;
  }): Promise<OwnershipWriteResult> {
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

    if (currentEvent.workerId === input.newWorkerId) {
      return {
        event: currentEvent,
        status: "noop",
      };
    }

    return {
      event: await this.insertEvent({
        createdBy: input.reassignedBy,
        eventType: "reassigned",
        locationId: input.locationId,
        ...(input.now ? { now: input.now } : {}),
        skuId: input.skuId,
        ...(input.quantity != null ? { quantity: input.quantity } : {}),
        workerId: input.newWorkerId,
      }),
      status: "created",
    };
  }

  private async insertEvent(input: {
    createdBy: string;
    eventType: "assigned" | "reassigned";
    locationId: string;
    now?: Date;
    skuId: string;
    quantity?: number;
    workerId: string;
  }): Promise<OwnershipEventRecord> {
    const effectiveFrom = input.now ?? new Date();

    return this.repository.insertOwnershipEvent({
      createdBy: input.createdBy,
      effectiveFrom,
      eventType: input.eventType,
      handoverChainId: null,
      locationId: input.locationId,
      skuId: input.skuId,
      quantity: input.quantity ?? 1,
      workerId: input.workerId,
    });
  }
}
