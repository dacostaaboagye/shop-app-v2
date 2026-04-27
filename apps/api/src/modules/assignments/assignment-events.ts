import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

export type AssignmentEventContext = {
  locationId: string;
  locationName: string;
  productName: string;
  quantity: number;
  sku: string;
  skuId: string;
  variantName: string;
  workerId: string;
  workerName: string;
};

type AssignmentActor = {
  userSlug: string;
};

export function createAssignmentAssignedEvent(input: {
  actor: AssignmentActor;
  context: AssignmentEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createAssignmentEvent({
    actor: input.actor,
    context: input.context,
    occurredAt: input.occurredAt,
    summary: `Assignment created for ${input.context.workerName}: ${input.context.productName} ${input.context.variantName} (${input.context.sku}) x${input.context.quantity} at ${input.context.locationName}.`,
    type: "assignment.assigned",
  });
}

export function createAssignmentReassignedEvent(input: {
  actor: AssignmentActor;
  context: AssignmentEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  return createAssignmentEvent({
    actor: input.actor,
    context: input.context,
    occurredAt: input.occurredAt,
    summary: `Assignment reassigned to ${input.context.workerName}: ${input.context.productName} ${input.context.variantName} (${input.context.sku}) x${input.context.quantity} at ${input.context.locationName}.`,
    type: "assignment.reassigned",
  });
}

export function createAssignmentHandoverStartedEvent(input: {
  actor: AssignmentActor;
  fromWorkerName: string;
  handoverChainId: string;
  handoverInContext: AssignmentEventContext;
  occurredAt: Date;
}): PlatformEventRecord {
  const context = input.handoverInContext;

  return createAssignmentEvent({
    actor: input.actor,
    context,
    occurredAt: input.occurredAt,
    payload: { handoverChainId: input.handoverChainId },
    summary: `Handover started from ${input.fromWorkerName} to ${context.workerName}: ${context.productName} ${context.variantName} (${context.sku}) x${context.quantity} at ${context.locationName}.`,
    type: "assignment.handover_started",
  });
}

export function createAssignmentHandoverRevertedEvent(input: {
  actor: AssignmentActor;
  context: AssignmentEventContext;
  handoverChainId: string;
  occurredAt: Date;
}): PlatformEventRecord {
  return createAssignmentEvent({
    actor: input.actor,
    context: input.context,
    occurredAt: input.occurredAt,
    payload: { handoverChainId: input.handoverChainId },
    summary: `Handover reverted to ${input.context.workerName}: ${input.context.productName} ${input.context.variantName} (${input.context.sku}) x${input.context.quantity} at ${input.context.locationName}.`,
    type: "assignment.handover_reverted",
  });
}

function createAssignmentEvent(input: {
  actor: AssignmentActor;
  context: AssignmentEventContext;
  occurredAt: Date;
  payload?: Record<string, string>;
  summary: string;
  type: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      {
        kind: "permission",
        locationId: input.context.locationId,
        permission: "stock.assignments.view",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      locationId: input.context.locationId,
      locationName: input.context.locationName,
      productName: input.context.productName,
      quantity: input.context.quantity,
      sku: input.context.sku,
      skuId: input.context.skuId,
      variantName: input.context.variantName,
      workerId: input.context.workerId,
      workerName: input.context.workerName,
      ...(input.payload ?? {}),
    },
    resource: {
      kind: "assignment",
      reference: `${input.context.locationId}:${input.context.skuId}:${input.context.workerId}`,
    },
    summary: input.summary,
    type: input.type,
  };
}
