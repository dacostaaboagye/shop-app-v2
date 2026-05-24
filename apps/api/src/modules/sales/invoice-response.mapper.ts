import type { InvoiceResponse } from "@shop/contracts";

export function toInvoiceResponse(invoice: {
  attributedWorkerId: string | null;
  attributedWorkerName?: string | null;
  attributedWorkerEmail?: string | null;
  classification?: "outgoing" | "internal";
  confirmedAt: Date | null;
  createdAt: Date;
  customerBillingAddressLines?: string[] | null;
  customerContactReference?: string | null;
  currentPayableReference?: string | null;
  currencyCode: string;
  currencyScale: number;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerReference?: string | null;
  customerSlug?: string | null;
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
  parentInvoiceReference?: string | null;
  paymentMethod: string | null;
  reference: string;
  replacementInvoiceReference?: string | null;
  revisionCreditNoteReference?: string | null;
  revisionRootReference?: string | null;
  role?: "standard" | "credit_note" | "adjusted";
  status: "confirmed" | "superseded" | "voided";
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  type: "pos" | "portal" | "ecommerce" | "manual" | "credit_note" | "adjusted";
}): InvoiceResponse {
  const role =
    invoice.role ??
    (invoice.type === "credit_note"
      ? "credit_note"
      : invoice.type === "adjusted"
        ? "adjusted"
        : "standard");
  const parentInvoiceReference = invoice.parentInvoiceReference ?? null;
  const currentPayableReference = invoice.currentPayableReference ?? null;
  const replacementInvoiceReference =
    invoice.replacementInvoiceReference ?? null;
  const revisionCreditNoteReference =
    invoice.revisionCreditNoteReference ?? null;
  const revisionRootReference = invoice.revisionRootReference ?? null;
  const isLatestPayable =
    invoice.type !== "credit_note" &&
    invoice.status === "confirmed" &&
    (currentPayableReference === invoice.reference ||
      replacementInvoiceReference === null);

  return {
    attributedWorkerId: invoice.attributedWorkerId,
    attributedWorkerEmail: invoice.attributedWorkerEmail ?? null,
    attributedWorkerName: invoice.attributedWorkerName ?? null,
    classification: invoice.classification ?? "outgoing",
    confirmedAt: invoice.confirmedAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    customerBillingAddressLines: invoice.customerBillingAddressLines ?? null,
    customerContactReference: invoice.customerContactReference ?? null,
    currencyCode: invoice.currencyCode,
    currencyScale: invoice.currencyScale,
    customerEmail: invoice.customerEmail ?? null,
    customerName: invoice.customerName ?? null,
    customerPhone: invoice.customerPhone ?? null,
    customerReference: invoice.customerReference ?? null,
    customerSlug: invoice.customerSlug ?? null,
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
    parentInvoiceReference,
    paymentMethod: toPaymentMethod(invoice.paymentMethod),
    reference: invoice.reference,
    replacementInvoiceReference,
    revisionChain: {
      currentPayableReference:
        currentPayableReference ??
        (isLatestPayable ? invoice.reference : replacementInvoiceReference),
      isLatestPayable,
      replacementInvoiceReference,
      revisionCreditNoteReference,
      revisionRootReference,
      sourceInvoiceReference: parentInvoiceReference,
    },
    role,
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
