import type { ManualInvoiceRequestResponse } from "@shop/contracts";
import type { ManualInvoiceRequestRecord } from "./manual-invoice-request.types.js";

export function toManualInvoiceRequestResponse(
  request: ManualInvoiceRequestRecord,
): ManualInvoiceRequestResponse {
  return {
    approvedAt: request.approvedAt?.toISOString() ?? null,
    approvedByName: request.approvedByName,
    approvedInvoiceReference: request.approvedInvoiceReference,
    createdAt: request.createdAt.toISOString(),
    currencyCode: request.currencyCode,
    currencyScale: request.currencyScale,
    customerBillingAddressLines: request.customerBillingAddressLines,
    customerContactReference: request.customerContactReference ?? null,
    customerEmail: request.customerEmail,
    customerName: request.customerName,
    customerPhone: request.customerPhone,
    customerReference: request.customerReference ?? null,
    customerSlug: request.customerSlug ?? null,
    customerTaxNumber: request.customerTaxNumber,
    lines: request.lines,
    locationId: request.locationId,
    locationName: request.locationName,
    paymentMethod: request.paymentMethod,
    reason: request.reason,
    reference: request.reference,
    rejectedAt: request.rejectedAt?.toISOString() ?? null,
    rejectedByName: request.rejectedByName,
    rejectionReason: request.rejectionReason,
    requestedByName: request.requestedByName,
    status: request.status,
    subtotalAmount: request.subtotalAmount,
    supportingNote: request.supportingNote,
    taxAmount: request.taxAmount,
    totalAmount: request.totalAmount,
    updatedAt: request.updatedAt.toISOString(),
  };
}
