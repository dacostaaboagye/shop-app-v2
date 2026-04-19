import { invoiceLineItems, invoices } from "@shop/database";
import type { InvoiceLineItemRecord, InvoiceRecord } from "./sales.contracts.js";

export function mapInvoice(row: typeof invoices.$inferSelect): InvoiceRecord {
  return {
    attributedWorkerId: row.attributedWorkerId,
    attributedWorkerName: null,
    attributedWorkerEmail: null,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    id: row.id,
    locationId: row.locationId,
    notes: row.notes,
    parentInvoiceId: row.parentInvoiceId,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
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
    skuSnapshot: row.skuSnapshot as { sku: string; variantName: string; productName: string },
    stockMovementId: row.stockMovementId,
    taxAmount: row.taxAmount,
    taxCategory: row.taxCategory,
    taxRate: row.taxRate,
    unitPrice: row.unitPrice,
    updatedAt: row.updatedAt,
  };
}
