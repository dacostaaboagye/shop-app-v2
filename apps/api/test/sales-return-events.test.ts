import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";
import { createSalesReturnProcessedEvent } from "../src/modules/sales/sales-return-events.js";

const NOW = new Date("2026-04-26T19:00:00.000Z");

describe("createSalesReturnProcessedEvent", () => {
  it("creates an operator-readable return event with credit note context", () => {
    const event = createSalesReturnProcessedEvent({
      actor: { userSlug: "worker-user" },
      creditNote: invoice({
        reference: "CN/2026/000001",
        totalAmount: "20.48",
        type: "credit_note",
      }),
      locationName: "Downtown Store",
      occurredAt: NOW,
      parentInvoice: invoice(),
      reason: "Customer return",
    });

    assert.equal(event.type, "sales.return.processed");
    assert.equal(
      event.summary,
      "Sales return processed at Downtown Store: CN/2026/000001 issued against INV/2026/000001 for GHS 20.48.",
    );
    assert.deepEqual(event.audience, [
      {
        kind: "permission",
        locationId: "location-1",
        permission: "pos.sales.manage",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ]);
  });
});

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: "worker-1",
    attributedWorkerName: "Store Worker",
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: "worker-1",
    customerBillingAddressLines: null,
    currencyCode: "GHS",
    currencyScale: 2,
    customerEmail: null,
    customerName: null,
    customerPhone: null,
    customerTaxNumber: null,
    id: "invoice-1",
    lines: [],
    locationId: "location-1",
    notes: null,
    parentInvoiceId: null,
    parentInvoiceReference: null,
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    currentPayableReference: "INV/2026/000001",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "20.48",
    taxAmount: "0.00",
    totalAmount: "20.48",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}
