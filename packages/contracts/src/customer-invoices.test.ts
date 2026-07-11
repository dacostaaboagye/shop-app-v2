import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerInvoiceListQuerySchema,
  customerInvoiceResponseSchema,
} from "./customer-invoices.js";

describe("customer invoice contracts", () => {
  it("accepts customer invoice filters with safe defaults", () => {
    const parsed = customerInvoiceListQuerySchema.parse({
      currentPayableOnly: "true",
      documentType: "credit_note",
      page: "2",
      pageSize: "10",
      q: "INV-CPO",
      status: "confirmed",
    });

    assert.equal(parsed.currentPayableOnly, true);
    assert.equal(parsed.documentType, "credit_note");
    assert.equal(parsed.page, 2);
    assert.equal(parsed.pageSize, 10);
    assert.equal(parsed.q, "INV-CPO");
    assert.equal(parsed.status, "confirmed");
  });

  it("keeps customer invoice responses free of workforce and stock internals", () => {
    const parsed = customerInvoiceResponseSchema.parse({
      classification: "outgoing",
      confirmedAt: "2026-05-18T10:00:00.000Z",
      createdAt: "2026-05-18T10:00:00.000Z",
      currencyCode: "GHS",
      currencyScale: 2,
      customerBillingAddressLines: ["12 Market Street"],
      customerContactReference: "CON-00001",
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: null,
      customerReference: "CUS-00001",
      customerSlug: "adwoa-mensah",
      customerTaxNumber: null,
      lines: [
        {
          lineTotal: "12.50",
          quantity: 1,
          skuSnapshot: {
            productName: "Bottled Water",
            sku: "BW-L",
            variantName: "Large",
          },
          taxAmount: "0.00",
          taxCategory: null,
          taxRate: null,
          unitPrice: "12.50",
        },
      ],
      notes: null,
      parentInvoiceReference: null,
      paymentMethod: null,
      reference: "INV-CPO-00001",
      replacementInvoiceReference: null,
      revisionChain: {
        currentPayableReference: "INV-CPO-00001",
        isLatestPayable: true,
        replacementInvoiceReference: null,
        revisionCreditNoteReference: null,
        revisionRootReference: null,
        sourceInvoiceReference: null,
      },
      role: "standard",
      status: "confirmed",
      subtotalAmount: "12.50",
      taxAmount: "0.00",
      totalAmount: "12.50",
      type: "portal",
    });

    assert.equal("attributedWorkerId" in parsed, false);
    assert.equal("locationId" in parsed, false);
    const firstLine = parsed.lines[0];
    assert.ok(firstLine);
    assert.equal("skuId" in firstLine, false);
    assert.equal("stockMovementId" in firstLine, false);
  });
});
