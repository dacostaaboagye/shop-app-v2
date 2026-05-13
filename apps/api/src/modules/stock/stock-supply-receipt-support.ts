import { AppError } from "../_core/errors/app-error.js";

export type NormalizedReceiptInput = {
  approvedQuantity: number;
  discrepancyNotes: string | undefined;
  discrepancyReason: string | undefined;
  receivedQuantity: number | undefined;
};

export function normalizeReceiptInput(input: NormalizedReceiptInput) {
  const receivedQuantity = input.receivedQuantity ?? input.approvedQuantity;

  if (receivedQuantity > input.approvedQuantity) {
    throw new AppError({
      code: "validation_error",
      detail: "Received quantity cannot exceed dispatched quantity.",
      details: {
        dispatchedQuantity: input.approvedQuantity,
        receivedQuantity,
      },
      statusCode: 400,
      title: "Invalid received quantity",
    });
  }

  const missingQuantity = input.approvedQuantity - receivedQuantity;
  if (missingQuantity > 0 && !input.discrepancyReason) {
    throw new AppError({
      code: "validation_error",
      detail:
        "A discrepancy reason is required when received quantity is lower than dispatched quantity.",
      details: {
        dispatchedQuantity: input.approvedQuantity,
        missingQuantity,
        receivedQuantity,
      },
      statusCode: 400,
      title: "Discrepancy reason required",
    });
  }

  const trimmedNotes = input.discrepancyNotes?.trim();

  return {
    discrepancyNotes: missingQuantity > 0 && trimmedNotes ? trimmedNotes : null,
    discrepancyReason:
      missingQuantity > 0 ? (input.discrepancyReason ?? null) : null,
    expectedQuantity: input.approvedQuantity,
    missingQuantity,
    receivedQuantity,
  };
}
