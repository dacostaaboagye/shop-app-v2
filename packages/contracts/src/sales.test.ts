import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invoiceListQuerySchema,
  invoiceResponseSchema,
  processPosPaymentRequestSchema,
} from "./sales.js";

describe("sales contracts", () => {
  it("accepts invoice document type filters", () => {
    const parsed = invoiceListQuerySchema.parse({
      documentType: "credit_note",
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      page: "2",
    });

    assert.equal(parsed.documentType, "credit_note");
    assert.equal(parsed.page, 2);
  });

  it("defaults invoice document type to all", () => {
    const parsed = invoiceListQuerySchema.parse({
      locationId: "4181707d-c61e-4c22-995d-335295748060",
    });

    assert.equal(parsed.documentType, "all");
  });

  it("accepts customer billing details on invoices", () => {
    const parsed = invoiceResponseSchema.parse({
      attributedWorkerEmail: null,
      attributedWorkerId: null,
      attributedWorkerName: null,
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
      paymentMethod: "transfer",
      reference: "INV-000042",
      status: "confirmed",
      subtotalAmount: "1200.00",
      taxAmount: "180.00",
      totalAmount: "1380.00",
      type: "portal",
    });

    assert.equal(parsed.customerName, "Adwoa Mensah");
    assert.equal(parsed.currencyCode, "GHS");
    assert.deepEqual(parsed.customerBillingAddressLines, [
      "12 Market Street",
      "Accra",
    ]);
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
    assert.equal(parsed.currencyScale, 2);
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
});
