import {
  InvalidReturnError,
  type InvoiceWithLines,
  MixedOwnershipSaleError,
  SaleVariantNotFoundError,
} from "./sales.contracts.js";

export { resolveCurrentPayableInvoice } from "./invoice-lifecycle.js";

export function aggregateReturnQuantities(
  lines: Array<{ quantity: number; skuId: string }>,
): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const line of lines) {
    quantities.set(
      line.skuId,
      (quantities.get(line.skuId) ?? 0) + line.quantity,
    );
  }

  return quantities;
}

export function buildSaleLineItems(input: {
  lines: Array<{ quantity: number; skuId: string; unitPrice?: string }>;
  locationId: string;
  variantDetails: Map<
    string,
    {
      name: string;
      productName: string;
      sellingPrice: string;
      sku: string;
      taxCategory: string | null;
    }
  >;
}) {
  return input.lines.map((line) => {
    const variant = input.variantDetails.get(line.skuId);
    if (!variant) {
      throw new SaleVariantNotFoundError(line.skuId);
    }
    const customPrice =
      line.unitPrice !== undefined && line.unitPrice !== ""
        ? parseFloat(line.unitPrice)
        : NaN;
    const unitPrice =
      !Number.isNaN(customPrice) && customPrice >= 0
        ? customPrice
        : parseFloat(variant.sellingPrice);
    const subtotal = roundCurrency(unitPrice * line.quantity);

    return {
      lineTotal: subtotal.toFixed(2),
      locationId: input.locationId,
      quantity: line.quantity,
      skuId: line.skuId,
      skuSnapshot: {
        productName: variant.productName,
        sku: variant.sku,
        variantName: variant.name,
      },
      taxAmount: "0.00",
      taxCategory: variant.taxCategory,
      taxRate: null as string | null,
      unitPrice: unitPrice.toFixed(2),
    };
  });
}

export function buildAdjustedInvoiceLines(input: {
  originalInvoice: InvoiceWithLines;
  requestedReturnQuantities: Map<string, number>;
}) {
  return input.originalInvoice.lines
    .map((line) => {
      const returnQuantity =
        input.requestedReturnQuantities.get(line.skuId) ?? 0;
      const remainingQuantity = line.quantity - returnQuantity;

      if (remainingQuantity <= 0) return null;

      const unitPrice = parseFloat(line.unitPrice);
      const taxPerUnit = parseFloat(line.taxAmount) / line.quantity;

      return {
        lineTotal: roundCurrency(unitPrice * remainingQuantity).toFixed(2),
        quantity: remainingQuantity,
        skuId: line.skuId,
        skuSnapshot: line.skuSnapshot,
        taxAmount: roundCurrency(taxPerUnit * remainingQuantity).toFixed(2),
        taxCategory: line.taxCategory,
        taxRate: line.taxRate,
        unitPrice: line.unitPrice,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
}

export function buildReturnInvoiceLines(input: {
  originalLineMap: Map<string, InvoiceWithLines["lines"][number]>;
  parentReference: string;
  requestedReturnQuantities: Map<string, number>;
}) {
  return Array.from(input.requestedReturnQuantities.entries()).map(
    ([skuId, quantity]) => {
      const originalLine = input.originalLineMap.get(skuId);
      if (!originalLine) {
        throw new InvalidReturnError(
          `SKU ${skuId} was not on the original invoice ${input.parentReference}.`,
          { skuId },
        );
      }

      const unitPrice = parseFloat(originalLine.unitPrice);
      const lineTotal = roundCurrency(unitPrice * quantity);
      const taxAmount = roundCurrency(
        parseFloat(originalLine.taxAmount) / originalLine.quantity,
      );

      return {
        lineTotal: lineTotal.toFixed(2),
        quantity,
        skuId,
        skuSnapshot: originalLine.skuSnapshot,
        taxAmount: roundCurrency(taxAmount * quantity).toFixed(2),
        taxCategory: originalLine.taxCategory,
        taxRate: originalLine.taxRate,
        unitPrice: originalLine.unitPrice,
      };
    },
  );
}

export function resolveAttributedWorkerId(
  attributions: Array<{ workerId: string }>,
) {
  const workerIds = new Set(attributions.map((a) => a.workerId));

  if (workerIds.size > 1) {
    throw new MixedOwnershipSaleError();
  }

  const attributedWorkerId = workerIds.values().next().value;
  if (!attributedWorkerId) {
    throw new MixedOwnershipSaleError();
  }

  return attributedWorkerId;
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateReturnQuantities(input: {
  originalInvoice: InvoiceWithLines;
  parentReference: string;
  requestedReturnQuantities: Map<string, number>;
}) {
  const originalLineMap = new Map(
    input.originalInvoice.lines.map((line) => [line.skuId, line]),
  );

  for (const [skuId, quantity] of input.requestedReturnQuantities) {
    const originalLine = originalLineMap.get(skuId);
    if (!originalLine) {
      throw new InvalidReturnError(
        `SKU ${skuId} was not on the original invoice ${input.parentReference}.`,
        { skuId },
      );
    }
    if (quantity > originalLine.quantity) {
      throw new InvalidReturnError(
        `Cannot return more than the original quantity for SKU ${skuId}.`,
        {
          originalQuantity: originalLine.quantity,
          returnQuantity: quantity,
          skuId,
        },
      );
    }
  }

  return originalLineMap;
}
