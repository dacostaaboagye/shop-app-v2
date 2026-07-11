import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createManualInvoiceRequestSchema,
  manualInvoiceRequestResponseSchema,
} from "./manual-invoices.js";

describe("manual invoice contracts", () => {
  it("allows a CRM customer selection instead of duplicate customer entry", () => {
    const parsed = createManualInvoiceRequestSchema.parse({
      customerContactReference: "CON-00001",
      customerSlug: "adwoa-mensah",
      lines: [
        {
          quantity: 1,
          skuId: "4181707d-c61e-4c22-995d-335295748060",
          unitPrice: "12.50",
        },
      ],
      locationId: "5181707d-c61e-4c22-995d-335295748060",
      reason: "Customer needs replacement receipt",
    });

    assert.equal(parsed.customerSlug, "adwoa-mensah");
    assert.equal(parsed.customerName, undefined);
  });

  it("requires a customer name when no CRM customer is selected", () => {
    assert.throws(
      () =>
        createManualInvoiceRequestSchema.parse({
          lines: [
            {
              quantity: 1,
              skuId: "4181707d-c61e-4c22-995d-335295748060",
              unitPrice: "12.50",
            },
          ],
          locationId: "5181707d-c61e-4c22-995d-335295748060",
          reason: "Customer needs replacement receipt",
        }),
      /Customer name is required/,
    );
  });

  it("requires a CRM customer when selecting a customer contact", () => {
    assert.throws(
      () =>
        createManualInvoiceRequestSchema.parse({
          customerContactReference: "CON-00001",
          customerName: "Adwoa Mensah",
          lines: [
            {
              quantity: 1,
              skuId: "4181707d-c61e-4c22-995d-335295748060",
              unitPrice: "12.50",
            },
          ],
          locationId: "5181707d-c61e-4c22-995d-335295748060",
          reason: "Customer needs replacement receipt",
        }),
      /Customer contact requires/,
    );
  });

  it("exposes public customer references on request responses", () => {
    const parsed = manualInvoiceRequestResponseSchema.parse({
      approvedAt: null,
      approvedByName: null,
      approvedInvoiceReference: null,
      createdAt: "2026-05-23T10:00:00.000Z",
      currencyCode: "GHS",
      currencyScale: 2,
      customerBillingAddressLines: ["12 Market Street", "Accra"],
      customerContactReference: "CON-00001",
      customerEmail: "billing@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: null,
      customerReference: "CUS-00001",
      customerSlug: "adwoa-mensah",
      customerTaxNumber: "TIN-123",
      lines: [],
      locationId: "5181707d-c61e-4c22-995d-335295748060",
      locationName: "East Legon",
      paymentMethod: null,
      reason: "Customer needs replacement receipt",
      reference: "MIR-00001",
      rejectedAt: null,
      rejectedByName: null,
      rejectionReason: null,
      requestedByName: "Requester",
      status: "pending",
      subtotalAmount: "12.50",
      supportingNote: null,
      taxAmount: "0.00",
      totalAmount: "12.50",
      updatedAt: "2026-05-23T10:00:00.000Z",
    });

    assert.equal(parsed.customerReference, "CUS-00001");
    assert.equal(parsed.customerContactReference, "CON-00001");
  });
});
