import { AppError } from "../_core/errors/app-error.js";
import { DeliverySourceNotFoundError } from "./delivery-errors.js";
import {
  DeliveryAgentNotEligibleError,
  DeliveryAssignmentRequiredError,
  DeliveryCancellationReasonRequiredError,
  DeliveryIllegalStatusTransitionError,
  DeliveryReassignmentNotAllowedError,
  DeliveryStatusConflictError,
  DeliveryTerminalStatusError,
} from "./delivery-status.errors.js";

export async function runStatusTransitionSafely<T>(
  operation: () => Promise<T>,
  context: { assignedUserSlug?: string; deliveryReference: string },
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPublicDeliveryStatusError(error, context);
  }
}

function mapPublicDeliveryStatusError(
  error: unknown,
  context: { assignedUserSlug?: string; deliveryReference: string },
): unknown {
  if (
    error instanceof DeliverySourceNotFoundError ||
    error instanceof DeliveryIllegalStatusTransitionError ||
    error instanceof DeliveryTerminalStatusError ||
    error instanceof DeliveryStatusConflictError ||
    error instanceof DeliveryAssignmentRequiredError ||
    error instanceof DeliveryCancellationReasonRequiredError ||
    error instanceof DeliveryAgentNotEligibleError ||
    error instanceof DeliveryReassignmentNotAllowedError
  ) {
    const details = sanitizeDeliveryErrorDetails(error.details, context);
    return new AppError({
      code: error.code,
      detail: buildPublicStatusErrorDetail(error, context),
      ...(details ? { details } : {}),
      statusCode: error.statusCode,
      title: error.title,
    });
  }
  return error;
}

function sanitizeDeliveryErrorDetails(
  details: unknown,
  context: { assignedUserSlug?: string; deliveryReference: string },
): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object") {
    return undefined;
  }
  const source = details as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "deliveryId" || key === "userId") {
      continue;
    }
    if (key === "sourceReference" && source.sourceType === "delivery") {
      sanitized[key] = context.deliveryReference;
      continue;
    }
    sanitized[key] = value;
  }
  sanitized.deliveryReference = context.deliveryReference;
  if (context.assignedUserSlug) {
    sanitized.assignedUserSlug = context.assignedUserSlug;
  }
  return sanitized;
}

function buildPublicStatusErrorDetail(
  error: {
    details: unknown;
    message: string;
    title: string;
  },
  context: { assignedUserSlug?: string; deliveryReference: string },
): string {
  const details =
    error.details && typeof error.details === "object"
      ? (error.details as Record<string, unknown>)
      : {};
  const currentStatus = details.currentStatus;
  const expectedStatus = details.expectedStatus;
  const observedStatus = details.observedStatus;
  const fromStatus = details.fromStatus;
  const toStatus = details.toStatus;
  if (error instanceof DeliveryAgentNotEligibleError) {
    return `User ${context.assignedUserSlug ?? "selected agent"} cannot be assigned to delivery ${context.deliveryReference}; missing agent role at the origin location.`;
  }
  if (error instanceof DeliverySourceNotFoundError) {
    return `No delivery found for reference ${context.deliveryReference}.`;
  }
  if (error instanceof DeliveryIllegalStatusTransitionError) {
    return `Delivery ${context.deliveryReference} cannot transition from "${fromStatus}" to "${toStatus}".`;
  }
  if (error instanceof DeliveryTerminalStatusError) {
    return `Delivery ${context.deliveryReference} is "${currentStatus}" and cannot transition further.`;
  }
  if (error instanceof DeliveryStatusConflictError) {
    return `Delivery ${context.deliveryReference} expected status "${expectedStatus}" but observed "${observedStatus ?? "unknown"}".`;
  }
  if (error instanceof DeliveryAssignmentRequiredError) {
    return `Cannot transition delivery ${context.deliveryReference} to "assigned" without an assignedUserSlug.`;
  }
  if (error instanceof DeliveryCancellationReasonRequiredError) {
    return `Cannot cancel delivery ${context.deliveryReference} without a reason.`;
  }
  if (error instanceof DeliveryReassignmentNotAllowedError) {
    return `Delivery ${context.deliveryReference} is "${currentStatus}" and can only be reassigned while in "assigned".`;
  }
  return error.message;
}
