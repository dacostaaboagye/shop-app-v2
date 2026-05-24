import {
  customerInvoiceListItemResponseSchema,
  customerInvoiceResponseSchema,
} from "@shop/contracts";
import { toInvoiceResponse } from "./invoice-response.mapper.js";
import type { InvoiceRecord, InvoiceWithLines } from "./sales.contracts.js";

export function toCustomerInvoiceResponse(invoice: InvoiceWithLines) {
  return customerInvoiceResponseSchema.parse(toInvoiceResponse(invoice));
}

export function toCustomerInvoiceListItemResponse(invoice: InvoiceRecord) {
  return customerInvoiceListItemResponseSchema.parse(
    toInvoiceResponse({ ...invoice, lines: [] }),
  );
}
