import type { InvoiceResponse } from "@shop/contracts";

export function toInvoiceResponse(invoice: {
  attributedWorkerId: string | null;
  attributedWorkerName?: string | null;
  attributedWorkerEmail?: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  customerBillingAddressLines?: string[] | null;
  currencyCode: string;
  currencyScale: number;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerTaxNumber?: string | null;
  lines: {
    lineTotal: string;
    quantity: number;
    skuId: string;
    skuSnapshot: { sku: string; variantName: string; productName: string };
    stockMovementId: string | null;
    taxAmount: string;
    taxCategory: string | null;
    taxRate: string | null;
    unitPrice: string;
  }[];
  locationId: string;
  notes: string | null;
  paymentMethod: string | null;
  reference: string;
  status: "confirmed" | "voided";
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  type: "pos" | "portal" | "ecommerce" | "manual" | "credit_note";
}): InvoiceResponse {
  return {
    attributedWorkerId: invoice.attributedWorkerId,
    attributedWorkerEmail: invoice.attributedWorkerEmail ?? null,
    attributedWorkerName: invoice.attributedWorkerName ?? null,
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    customerBillingAddressLines: invoice.customerBillingAddressLines ?? null,
    currencyCode: invoice.currencyCode,
    currencyScale: invoice.currencyScale,
    customerEmail: invoice.customerEmail ?? null,
    customerName: invoice.customerName ?? null,
    customerPhone: invoice.customerPhone ?? null,
    customerTaxNumber: invoice.customerTaxNumber ?? null,
    lines: invoice.lines.map((line) => ({
      lineTotal: line.lineTotal,
      quantity: line.quantity,
      skuId: line.skuId,
      skuSnapshot: line.skuSnapshot,
      stockMovementId: line.stockMovementId,
      taxAmount: line.taxAmount,
      taxCategory: line.taxCategory,
      taxRate: line.taxRate,
      unitPrice: line.unitPrice,
    })),
    locationId: invoice.locationId,
    notes: invoice.notes,
    paymentMethod: toPaymentMethod(invoice.paymentMethod),
    reference: invoice.reference,
    status: invoice.status,
    subtotalAmount: invoice.subtotalAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    type: invoice.type,
  };
}

function toPaymentMethod(
  value: string | null,
): InvoiceResponse["paymentMethod"] {
  if (
    value === "cash" ||
    value === "card" ||
    value === "mobile_money" ||
    value === "transfer"
  ) {
    return value;
  }

  return null;
}
