import {
  type IssuedDocumentSnapshotResponse,
  invoiceResponseSchema,
} from "@shop/contracts";
import type { PrintableInvoiceData } from "./sales-document";

export type SalesDocumentSnapshot = Omit<
  IssuedDocumentSnapshotResponse,
  "payloadSnapshot"
> & {
  payloadSnapshot: PrintableInvoiceData;
};

export function toSalesDocumentSnapshot(
  snapshot: IssuedDocumentSnapshotResponse,
): SalesDocumentSnapshot | null {
  const payload = invoiceResponseSchema.safeParse(snapshot.payloadSnapshot);
  if (!payload.success) return null;
  return {
    ...snapshot,
    payloadSnapshot: payload.data,
  };
}
