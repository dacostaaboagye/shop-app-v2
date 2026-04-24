import type {
  InvoiceLineItemResponse,
  ProcessPosReturnRequest,
} from "@shop/contracts";

export type ReturnQuantityMap = Record<string, string>;

export type ReturnRequestDraft =
  | { ok: true; request: ProcessPosReturnRequest }
  | { fieldErrors: Record<string, string>; formError: string; ok: false };

export function buildReturnRequestDraft(input: {
  lines: InvoiceLineItemResponse[];
  quantities: ReturnQuantityMap;
  reason: string;
}): ReturnRequestDraft {
  const fieldErrors: Record<string, string> = {};
  const returnLines: ProcessPosReturnRequest["lines"] = [];

  for (const line of input.lines) {
    const rawQuantity = input.quantities[line.skuId]?.trim();
    if (!rawQuantity) continue;

    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      fieldErrors[line.skuId] = "Enter a whole number.";
      continue;
    }
    if (quantity === 0) continue;
    if (quantity > line.quantity) {
      fieldErrors[line.skuId] = `Cannot return more than ${line.quantity}.`;
      continue;
    }

    returnLines.push({ quantity, skuId: line.skuId });
  }

  const reason = input.reason.trim();
  if (!reason) {
    fieldErrors.reason = "Enter the return reason.";
  }
  if (reason.length > 500) {
    fieldErrors.reason = "Reason must be 500 characters or fewer.";
  }

  if (returnLines.length === 0) {
    return {
      fieldErrors,
      formError: "Select at least one item quantity to return.",
      ok: false,
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      formError: "Fix the highlighted return details.",
      ok: false,
    };
  }

  return { ok: true, request: { lines: returnLines, reason } };
}

export function getInitialReturnQuantities(
  lines: InvoiceLineItemResponse[],
): ReturnQuantityMap {
  return Object.fromEntries(lines.map((line) => [line.skuId, "0"]));
}
