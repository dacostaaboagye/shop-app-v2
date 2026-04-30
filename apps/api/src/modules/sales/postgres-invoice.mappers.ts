import type { invoiceLineItems, invoices } from "@shop/database";
import type {
  InvoiceLineItemRecord,
  InvoiceRecord,
} from "./sales.contracts.js";

export function mapInvoice(row: typeof invoices.$inferSelect): InvoiceRecord {
  return {
    attributedWorkerId: row.attributedWorkerId,
    attributedWorkerName: null,
    attributedWorkerEmail: null,
    classification: row.classification,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    currentPayableReference: null,
    customerBillingAddressLines: row.customerBillingAddressLines ?? null,
    currencyCode: row.currencyCode,
    currencyScale: row.currencyScale,
    customerEmail: row.customerEmail,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerTaxNumber: row.customerTaxNumber,
    id: row.id,
    locationId: row.locationId,
    notes: row.notes,
    parentInvoiceId: row.parentInvoiceId,
    parentInvoiceReference: null,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    replacementInvoiceId: row.replacementInvoiceId,
    replacementInvoiceReference: null,
    revisionCreditNoteId: row.revisionCreditNoteId,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: row.revisionRootInvoiceId,
    revisionRootReference: null,
    role:
      row.type === "credit_note"
        ? "credit_note"
        : row.type === "adjusted"
          ? "adjusted"
          : "standard",
    status: row.status,
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    type: row.type,
    updatedAt: row.updatedAt,
    voidedAt: row.voidedAt,
    voidReason: row.voidReason,
  };
}

export function mapLineItem(
  row: typeof invoiceLineItems.$inferSelect,
): InvoiceLineItemRecord {
  return {
    createdAt: row.createdAt,
    id: row.id,
    invoiceId: row.invoiceId,
    lineTotal: row.lineTotal,
    quantity: row.quantity,
    skuId: row.skuId,
    skuSnapshot: row.skuSnapshot as {
      sku: string;
      variantName: string;
      productName: string;
    },
    stockMovementId: row.stockMovementId,
    taxAmount: row.taxAmount,
    taxCategory: row.taxCategory,
    taxRate: row.taxRate,
    unitPrice: row.unitPrice,
    updatedAt: row.updatedAt,
  };
}
