import type { manualInvoiceRequestLines } from "@shop/database";
import { AppError } from "../_core/errors/app-error.js";
import type { ManualInvoiceRequestRecord } from "./manual-invoice-request.types.js";

type ManualInvoiceRequestRow = {
  approvedAt: Date | null;
  approvedBy: string | null;
  approvedByUser?: { firstName: string; lastName: string } | null;
  approvedInvoice?: { reference: string } | null;
  approvedInvoiceId: string | null;
  createdAt: Date;
  currencyCode: string;
  currencyScale: number;
  customerBillingAddressLines: string[] | null;
  customer?: { reference: string; slug: string } | null;
  customerContact?: { reference: string } | null;
  customerContactId: string | null;
  customerEmail: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTaxNumber: string | null;
  id: string;
  lines?: Array<typeof manualInvoiceRequestLines.$inferSelect>;
  location?: { name: string } | null;
  locationId: string;
  paymentMethod: string | null;
  reason: string;
  reference: string;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectedByUser?: { firstName: string; lastName: string } | null;
  rejectionReason: string | null;
  requestedBy: string;
  requester?: { firstName: string; lastName: string } | null;
  status: "approved" | "pending" | "rejected";
  subtotalAmount: string;
  supportingNote: string | null;
  taxAmount: string;
  totalAmount: string;
  updatedAt: Date;
};

export const manualInvoiceRequestRelations = {
  approvedByUser: { columns: { firstName: true, lastName: true } },
  approvedInvoice: { columns: { reference: true } },
  customer: { columns: { reference: true, slug: true } },
  customerContact: { columns: { reference: true } },
  lines: true,
  location: { columns: { name: true } },
  rejectedByUser: { columns: { firstName: true, lastName: true } },
  requester: { columns: { firstName: true, lastName: true } },
} as const;

export function mapManualInvoiceRequestRecord(
  row: ManualInvoiceRequestRow,
): ManualInvoiceRequestRecord {
  return {
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    approvedByName: formatName(row.approvedByUser),
    approvedInvoiceId: row.approvedInvoiceId,
    approvedInvoiceReference: row.approvedInvoice?.reference ?? null,
    createdAt: row.createdAt,
    currencyCode: row.currencyCode,
    currencyScale: row.currencyScale,
    customerBillingAddressLines: row.customerBillingAddressLines ?? null,
    customerContactId: row.customerContactId,
    customerContactReference: row.customerContact?.reference ?? null,
    customerEmail: row.customerEmail,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerReference: row.customer?.reference ?? null,
    customerSlug: row.customer?.slug ?? null,
    customerTaxNumber: row.customerTaxNumber,
    id: row.id,
    lines: (row.lines ?? []).map((line) => ({
      lineTotal: line.lineTotal,
      quantity: line.quantity,
      skuId: line.skuId,
      skuSnapshot: line.skuSnapshot,
      taxAmount: line.taxAmount,
      taxCategory: line.taxCategory,
      taxRate: line.taxRate,
      unitPrice: line.unitPrice,
    })),
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    paymentMethod: toPaymentMethod(row.paymentMethod),
    reason: row.reason,
    reference: row.reference,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectedByName: formatName(row.rejectedByUser),
    rejectionReason: row.rejectionReason,
    requestedBy: row.requestedBy,
    requestedByName: formatName(row.requester),
    status: row.status,
    subtotalAmount: row.subtotalAmount,
    supportingNote: row.supportingNote,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    updatedAt: row.updatedAt,
  };
}

export function manualInvoiceRequestNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Manual invoice request ${reference} does not exist.`,
    statusCode: 404,
    title: "Manual invoice request not found",
  });
}

export function manualInvoiceRequestStateError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "Only pending manual invoice requests can be changed.",
    statusCode: 409,
    title: "Manual invoice request is not pending",
  });
}

function formatName(user?: { firstName: string; lastName: string } | null) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim() || null;
}

function toPaymentMethod(value: string | null) {
  if (
    value === "card" ||
    value === "cash" ||
    value === "mobile_money" ||
    value === "transfer"
  ) {
    return value;
  }
  return null;
}
