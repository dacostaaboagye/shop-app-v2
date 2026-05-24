import {
  invoiceResponseSchema,
  type OfficialDocumentType,
} from "@shop/contracts";
import { toInvoiceResponse } from "../sales/invoice-response.mapper.js";
import type { InvoiceWithLines } from "../sales/sales.contracts.js";

export function toSalesDocumentPayloadSnapshot(
  invoice: InvoiceWithLines,
): Record<string, unknown> {
  return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
}

export function getSalesDocumentType(
  invoiceType: InvoiceWithLines["type"],
): OfficialDocumentType {
  if (invoiceType === "credit_note") return "credit_note";
  if (invoiceType === "pos") return "sales_receipt";
  return "sales_invoice";
}
