import { DELIVERY_ERROR_CODES, type DeliveryStatus } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export class DeliveryIllegalStatusTransitionError extends AppError {
  constructor(input: {
    deliveryId: string;
    from: DeliveryStatus;
    to: DeliveryStatus;
  }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Illegal delivery status transition",
      detail: `Delivery ${input.deliveryId} cannot transition from "${input.from}" to "${input.to}".`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.illegalTransition,
        deliveryId: input.deliveryId,
        fromStatus: input.from,
        toStatus: input.to,
      },
    });
    this.name = "DeliveryIllegalStatusTransitionError";
  }
}

export class DeliveryTerminalStatusError extends AppError {
  constructor(input: { deliveryId: string; currentStatus: DeliveryStatus }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Delivery is in a terminal status",
      detail: `Delivery ${input.deliveryId} is "${input.currentStatus}" and cannot transition further.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.terminalStatus,
        deliveryId: input.deliveryId,
        currentStatus: input.currentStatus,
      },
    });
    this.name = "DeliveryTerminalStatusError";
  }
}

export class DeliveryStatusConflictError extends AppError {
  constructor(input: {
    deliveryId: string;
    expectedStatus: DeliveryStatus;
    observedStatus: DeliveryStatus | null;
  }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Delivery status changed concurrently",
      detail: `Delivery ${input.deliveryId} expected status "${input.expectedStatus}" but observed "${input.observedStatus ?? "unknown"}".`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.statusConflict,
        deliveryId: input.deliveryId,
        expectedStatus: input.expectedStatus,
        observedStatus: input.observedStatus,
      },
    });
    this.name = "DeliveryStatusConflictError";
  }
}

export class DeliveryAssignmentRequiredError extends AppError {
  constructor(input: { deliveryId: string }) {
    super({
      code: "validation_error",
      statusCode: 400,
      title: "Delivery assignment requires an assignee",
      detail: `Cannot transition delivery ${input.deliveryId} to "assigned" without an assignedUserId.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.assignmentRequired,
        deliveryId: input.deliveryId,
      },
    });
    this.name = "DeliveryAssignmentRequiredError";
  }
}

export class DeliveryAgentNotEligibleError extends AppError {
  constructor(input: { deliveryId: string; userId: string }) {
    super({
      code: "validation_error",
      statusCode: 400,
      title: "User is not an eligible delivery agent",
      detail: `User ${input.userId} cannot be assigned to delivery ${input.deliveryId}; missing agent role at the origin location.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.agentNotEligible,
        deliveryId: input.deliveryId,
        userId: input.userId,
      },
    });
    this.name = "DeliveryAgentNotEligibleError";
  }
}

export class DeliveryReassignmentNotAllowedError extends AppError {
  constructor(input: { deliveryId: string; currentStatus: string }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Delivery cannot be reassigned in this state",
      detail: `Delivery ${input.deliveryId} is "${input.currentStatus}" and can only be reassigned while in "assigned".`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.reassignmentNotAllowed,
        deliveryId: input.deliveryId,
        currentStatus: input.currentStatus,
      },
    });
    this.name = "DeliveryReassignmentNotAllowedError";
  }
}
