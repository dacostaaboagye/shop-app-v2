import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";
import type { InvoiceWithLines } from "./sales.contracts.js";

export function createSalesReturnProcessedEvent(input: {
  actor: { userSlug: string };
  creditNote: InvoiceWithLines;
  locationName: string;
  occurredAt: Date;
  parentInvoice: InvoiceWithLines;
  reason: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      {
        kind: "permission",
        locationId: input.creditNote.locationId,
        permission: "pos.sales.manage",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      attributedWorkerId: input.creditNote.attributedWorkerId,
      creditNoteReference: input.creditNote.reference,
      currencyCode: input.creditNote.currencyCode,
      locationId: input.creditNote.locationId,
      locationName: input.locationName,
      parentInvoiceReference: input.parentInvoice.reference,
      reason: input.reason,
      totalAmount: input.creditNote.totalAmount,
    },
    resource: {
      kind: "invoice",
      reference: input.creditNote.reference,
    },
    summary: `Sales return processed at ${input.locationName}: ${input.creditNote.reference} issued against ${input.parentInvoice.reference} for ${input.creditNote.currencyCode} ${input.creditNote.totalAmount}.`,
    type: "sales.return.processed",
  };
}
