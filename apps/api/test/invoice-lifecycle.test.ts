import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveCurrentPayableReference,
  resolveLatestPayableReference,
} from "../src/modules/sales/invoice-lifecycle.js";

describe("invoice lifecycle helpers", () => {
  it("resolves the latest payable reference across replacement chains", async () => {
    const invoices = new Map([
      [
        "INV-POS-00001",
        invoiceReference({
          reference: "INV-POS-00001",
          replacementInvoiceReference: "INV-POS-00002",
          status: "superseded",
        }),
      ],
      [
        "INV-POS-00002",
        invoiceReference({
          reference: "INV-POS-00002",
          replacementInvoiceReference: "INV-POS-00003",
          status: "superseded",
          type: "adjusted",
        }),
      ],
      [
        "INV-POS-00003",
        invoiceReference({
          reference: "INV-POS-00003",
          type: "adjusted",
        }),
      ],
    ]);

    const reference = await resolveLatestPayableReference({
      findByReference: async (input) => invoices.get(input) ?? null,
      reference: "INV-POS-00001",
    });

    assert.equal(reference, "INV-POS-00003");
  });

  it("starts credit-note payable resolution from its linked replacement", async () => {
    const invoices = new Map([
      [
        "INV-POS-00002",
        invoiceReference({
          reference: "INV-POS-00002",
          type: "adjusted",
        }),
      ],
    ]);

    const reference = await resolveCurrentPayableReference({
      findByReference: async (input) => invoices.get(input) ?? null,
      invoice: invoiceReference({
        parentInvoiceReference: "INV-POS-00001",
        reference: "CRN-INV-POS-00001",
        replacementInvoiceReference: "INV-POS-00002",
        type: "credit_note",
      }),
    });

    assert.equal(reference, "INV-POS-00002");
  });

  it("returns null when a replacement chain cycles", async () => {
    const invoices = new Map([
      [
        "INV-POS-00001",
        invoiceReference({
          reference: "INV-POS-00001",
          replacementInvoiceReference: "INV-POS-00002",
          status: "superseded",
        }),
      ],
      [
        "INV-POS-00002",
        invoiceReference({
          reference: "INV-POS-00002",
          replacementInvoiceReference: "INV-POS-00001",
          status: "superseded",
          type: "adjusted",
        }),
      ],
    ]);

    const reference = await resolveLatestPayableReference({
      findByReference: async (input) => invoices.get(input) ?? null,
      reference: "INV-POS-00001",
    });

    assert.equal(reference, null);
  });
});

function invoiceReference(overrides: {
  parentInvoiceReference?: string | null;
  reference: string;
  replacementInvoiceReference?: string | null;
  revisionRootReference?: string | null;
  status?: "confirmed" | "superseded" | "voided";
  type?: "adjusted" | "credit_note" | "ecommerce" | "manual" | "portal" | "pos";
}) {
  return {
    parentInvoiceReference: overrides.parentInvoiceReference ?? null,
    reference: overrides.reference,
    replacementInvoiceReference: overrides.replacementInvoiceReference ?? null,
    revisionRootReference: overrides.revisionRootReference ?? null,
    status: overrides.status ?? "confirmed",
    type: overrides.type ?? "pos",
  };
}
