"use client";

import type { AdminCreateSupplierProcurementOrderRequest } from "@shop/contracts";

export type PurchaseOrderDraftLine = {
  quantity: number;
  unitCost: string;
  variantSlug: string;
};

export function appendProcurementDraftLine(
  lines: PurchaseOrderDraftLine[],
  nextLine: PurchaseOrderDraftLine,
) {
  const existingIndex = lines.findIndex(
    (line) => line.variantSlug === nextLine.variantSlug,
  );

  if (existingIndex === -1) {
    return [...lines, nextLine];
  }

  return lines.map((line, index) =>
    index === existingIndex
      ? {
          ...line,
          quantity: nextLine.quantity,
          unitCost: nextLine.unitCost,
        }
      : line,
  );
}

export function removeProcurementDraftLine(
  lines: PurchaseOrderDraftLine[],
  variantSlug: string,
) {
  return lines.filter((line) => line.variantSlug !== variantSlug);
}

export function buildProcurementOrderPayload(input: {
  lines: PurchaseOrderDraftLine[];
  notes: string;
}): AdminCreateSupplierProcurementOrderRequest {
  return {
    lines: input.lines.map((line) => ({
      requestedQuantity: line.quantity,
      unitCost: line.unitCost || null,
      variantSlug: line.variantSlug,
    })),
    notes: input.notes.trim() ? input.notes.trim() : null,
  };
}
