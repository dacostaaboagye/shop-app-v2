import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invoiceCreationResponseSchema,
  invoiceListQuerySchema,
  invoiceResponseSchema,
  processPosPaymentRequestSchema,
} from "./sales.js";

describe("sales contracts", () => {
  it("accepts invoice document type filters", () => {
    const parsed = invoiceListQuerySchema.parse({
      classification: "outgoing",
      documentType: "credit_note",
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      page: "2",
    });

    assert.equal(parsed.classification, "outgoing");
    assert.equal(parsed.documentType, "credit_note");
    assert.equal(parsed.page, 2);
  });

  it("defaults invoice document type to all", () => {
    const parsed = invoiceListQuerySchema.parse({
      locationId: "4181707d-c61e-4c22-995d-335295748060",
    });

    assert.equal(parsed.documentType, "all");
    assert.equal(parsed.classification, "all");
  });

  it("accepts customer billing details on invoices", () => {
    const parsed = invoiceResponseSchema.parse({
      attributedWorkerEmail: null,
      attributedWorkerId: null,
      attributedWorkerName: null,
      classification: "outgoing",
      confirmedAt: "2026-04-21T10:00:00.000Z",
      createdAt: "2026-04-21T09:55:00.000Z",
      customerBillingAddressLines: ["12 Market Street", "Accra"],
      currencyCode: "GHS",
      currencyScale: 2,
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: "+233 20 000 0000",
      customerTaxNumber: "TIN-123",
      lines: [],
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      notes: null,
      parentInvoiceReference: null,
      paymentMethod: "transfer",
      reference: "INV-000042",
      replacementInvoiceReference: null,
      revisionChain: {
        currentPayableReference: "INV-000042",
        isLatestPayable: true,
        replacementInvoiceReference: null,
        revisionCreditNoteReference: null,
        revisionRootReference: null,
        sourceInvoiceReference: null,
      },
      role: "standard",
      status: "confirmed",
      subtotalAmount: "1200.00",
      taxAmount: "180.00",
      totalAmount: "1380.00",
      type: "portal",
    });

    assert.equal(parsed.customerName, "Adwoa Mensah");
    assert.equal(parsed.classification, "outgoing");
    assert.equal(parsed.currencyCode, "GHS");
    assert.deepEqual(parsed.customerBillingAddressLines, [
      "12 Market Street",
      "Accra",
    ]);
    assert.equal(parsed.revisionChain.isLatestPayable, true);
  });

  it("defaults customer billing details for existing POS snapshots", () => {
    const parsed = invoiceResponseSchema.parse({
      attributedWorkerEmail: null,
      attributedWorkerId: null,
      attributedWorkerName: null,
      confirmedAt: "2026-04-21T10:00:00.000Z",
      createdAt: "2026-04-21T09:55:00.000Z",
      currencyCode: "GHS",
      currencyScale: 2,
      lines: [],
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      notes: null,
      paymentMethod: "cash",
      reference: "INV-000043",
      status: "confirmed",
      subtotalAmount: "30.00",
      taxAmount: "0.00",
      totalAmount: "30.00",
      type: "pos",
    });

    assert.equal(parsed.customerName, null);
    assert.equal(parsed.customerEmail, null);
    assert.equal(parsed.customerBillingAddressLines, null);
    assert.equal(parsed.classification, "outgoing");
    assert.equal(parsed.currencyScale, 2);
    assert.equal(parsed.parentInvoiceReference, null);
    assert.equal(parsed.replacementInvoiceReference, null);
    assert.equal(parsed.revisionChain.currentPayableReference, null);
    assert.equal(parsed.revisionChain.isLatestPayable, false);
    assert.equal(parsed.role, "standard");
  });

  it("accepts optional buyer details on POS payment requests", () => {
    const parsed = processPosPaymentRequestSchema.parse({
      customerBillingAddressLines: ["12 Market Street", "Accra"],
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: "+233200000000",
      customerTaxNumber: "TIN-123",
      lines: [
        {
          quantity: 2,
          skuId: "4181707d-c61e-4c22-995d-335295748060",
        },
      ],
      locationId: "5181707d-c61e-4c22-995d-335295748060",
      paymentMethod: "cash",
    });

    assert.equal(parsed.customerName, "Adwoa Mensah");
    assert.deepEqual(parsed.customerBillingAddressLines, [
      "12 Market Street",
      "Accra",
    ]);
  });

  it("keeps creation responses free of workforce and stock internals", () => {
    const parsed = invoiceCreationResponseSchema.parse({
      classification: "outgoing",
      confirmedAt: "2026-05-18T10:00:00.000Z",
      createdAt: "2026-05-18T10:00:00.000Z",
      currencyCode: "GHS",
      currencyScale: 2,
      customerBillingAddressLines: null,
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: null,
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
