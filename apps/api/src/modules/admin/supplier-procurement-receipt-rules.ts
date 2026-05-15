import type { AdminSupplierProcurementReceiveRequest } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export function assertUniqueReceiptVariants(
  lines: AdminSupplierProcurementReceiveRequest["lines"],
) {
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.variantSlug)) {
      throw invalidReceiptQuantity({
        detail: `Receipt payload contains duplicate variant "${line.variantSlug}".`,
      });
    }
    seen.add(line.variantSlug);
  }
}

export function calculateReceiptDelta(input: {
  expectedQuantity: number;
  previousReceivedQuantity: number;
  receivedQuantity: number;
  variantSlug: string;
}) {
  if (input.receivedQuantity < input.previousReceivedQuantity) {
    throw invalidReceiptQuantity({
      detail: `Received quantity for "${input.variantSlug}" cannot be reduced from ${input.previousReceivedQuantity} to ${input.receivedQuantity}.`,
    });
  }
  if (input.receivedQuantity > input.expectedQuantity) {
    throw invalidReceiptQuantity({
      detail: `Received quantity for "${input.variantSlug}" cannot exceed expected quantity ${input.expectedQuantity}.`,
    });
  }
  return input.receivedQuantity - input.previousReceivedQuantity;
}

export function receiptMovementSourceKey(input: {
  lineId: string;
  receivedQuantity: number;
  reference: string;
}) {
  return `${input.reference}:${input.lineId}:${input.receivedQuantity}`;
}

export function missingProcurementLine(variantSlug: string): never {
  throw invalidReceiptQuantity({
    detail: `Variant "${variantSlug}" is not on this supplier procurement order.`,
  });
}

export function missingReceiptDestination(reference: string): AppError {
  return new AppError({
    code: "validation_error",
    detail: `Supplier procurement order "${reference}" has no destination location, so received goods cannot be added to stock.`,
    statusCode: 400,
    title: "Receipt destination required",
  });
}

function invalidReceiptQuantity(input: { detail: string }): AppError {
  return new AppError({
    code: "validation_error",
    detail: input.detail,
    statusCode: 400,
    title: "Invalid receipt quantity",
  });
}
