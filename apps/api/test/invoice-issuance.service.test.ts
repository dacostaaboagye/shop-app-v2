import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReferenceSequenceKey } from "../src/modules/public-identifiers/reference-number-formats.js";
import type { CreateIssuedInvoiceTransactionInput } from "../src/modules/sales/invoice-issuance.contracts.js";
import {
  type InvoiceIssuanceChannel,
  invoiceSequenceByChannel,
} from "../src/modules/sales/invoice-issuance.contracts.js";
import { InvoiceIssuanceService } from "../src/modules/sales/invoice-issuance.service.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";

const NOW = new Date("2026-05-18T10:00:00.000Z");

describe("InvoiceIssuanceService", () => {
  for (const channel of Object.keys(
    invoiceSequenceByChannel,
  ) as InvoiceIssuanceChannel[]) {
    it(`uses the ${channel} invoice sequence`, async () => {
      let reservedSequence: ReferenceSequenceKey | null = null;
      const service = createService({
        async generateReference(input) {
          reservedSequence = input.sequenceKey;
          return `REF-${channel}`;
        },
      });

      const prepared = await service.prepareInvoice({
        attributedWorkerId: null,
        channel,
        classification: "outgoing",
        createdBy: "user-1",
        lines: [{ quantity: 1, skuId: "sku-1" }],
        locationId: "location-1",
        now: NOW,
      });

      assert.equal(reservedSequence, invoiceSequenceByChannel[channel]);
      assert.equal(prepared.channel, channel);
      assert.equal(prepared.reference, `REF-${channel}`);
    });
  }

  it("prepares an immutable invoice snapshot from channel-neutral inputs", async () => {
    const service = createService();

    const prepared = await service.prepareInvoice({
      attributedWorkerId: "worker-1",
      channel: "portal",
      classification: "outgoing",
      createdBy: "customer-actor-1",
      customer: {
        billingAddressLines: ["12 Market Street", "Accra"],
        email: "buyer@example.com",
        name: "Adwoa Mensah",
        phone: "+233200000000",
        taxNumber: "TIN-123",
      },
      idempotencyKey: "portal-order-1",
      lines: [{ quantity: 3, skuId: "sku-1", unitPrice: "10.236" }],
      locationId: "location-1",
      notes: "Portal checkout",
      now: NOW,
      settlement: { paymentMethod: null },
      sourceReference: "CPO-20260518-0001",
    });

    assert.equal(prepared.channel, "portal");
    assert.equal(prepared.currencyCode, "GHS");
    assert.equal(prepared.customerName, "Adwoa Mensah");
    assert.equal(
      prepared.lineItems[0]?.skuSnapshot.productName,
      "Bottled Water",
    );
    assert.equal(prepared.lineItems[0]?.unitPrice, "10.24");
    assert.equal(prepared.lineItems[0]?.lineTotal, "30.71");
    assert.equal(prepared.subtotalAmount, "30.71");
    assert.equal(prepared.taxAmount, "0.00");
    assert.equal(prepared.totalAmount, "30.71");
  });

  it("can persist non-POS invoices without stock movement ownership", async () => {
    const persistedInput: {
      value: CreateIssuedInvoiceTransactionInput | null;
    } = { value: null };
    const service = createService({
      async createIssuedInvoiceTransaction(input) {
        persistedInput.value = input;
        return invoice({
          lines: input.lineItems.map((line, index) => ({
            ...line,
            createdAt: NOW,
            id: `line-${index + 1}`,
            invoiceId: "invoice-1",
            stockMovementId: null,
            updatedAt: NOW,
          })),
          reference: input.reference,
          type: input.channel,
        });
      },
    });

    const result = await service.issueInvoice({
      attributedWorkerId: null,
      channel: "manual",
      classification: "internal",
      createdBy: "admin-1",
      lines: [{ quantity: 1, skuId: "sku-1" }],
      locationId: "location-1",
      now: NOW,
      settlement: { paymentMethod: "transfer" },
      sourceReference: "manual-adjustment-1",
    });

    const persisted = persistedInput.value;
    assert.ok(persisted);
    assert.equal(persisted.channel, "manual");
    assert.equal(persisted.paymentMethod, "transfer");
    assert.equal(result.type, "manual");
    assert.equal(result.lines[0]?.stockMovementId, null);
  });
});

function createService(
  overrides: Partial<{
    createIssuedInvoiceTransaction: (
      input: CreateIssuedInvoiceTransactionInput,
    ) => Promise<InvoiceWithLines>;
    generateReference: (input: {
      now?: Date;
      sequenceKey: ReferenceSequenceKey;
    }) => Promise<string>;
  }> = {},
): InvoiceIssuanceService {
  return new InvoiceIssuanceService({
    catalogVariantRepository: {
      async getVariantsForSale() {
        return new Map([
          [
            "sku-1",
            {
              isTaxable: false,
              name: "Large",
              productName: "Bottled Water",
              productSlug: "bottled-water",
              sellingPrice: "12.50",
              sku: "BW-L",
              slug: "large",
              taxCategory: null,
            },
          ],
        ]);
      },
    },
    currencyResolver: {
      async resolveCurrencySnapshot() {
        return { currencyCode: "GHS", currencyScale: 2 };
      },
    },
    invoiceRepository: {
      async createIssuedInvoiceTransaction(input) {
        if (overrides.createIssuedInvoiceTransaction) {
          return overrides.createIssuedInvoiceTransaction(input);
        }
        return invoice({
          reference: input.reference,
          type: input.channel,
        });
      },
    },
    referenceNumberService: {
      async generateReference(input) {
        if (overrides.generateReference) {
          return overrides.generateReference(input);
        }
        return `REF-${input.sequenceKey}`;
      },
    },
  });
}

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: null,
    attributedWorkerId: null,
    attributedWorkerName: null,
    classification: "outgoing",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: "user-1",
    currencyCode: "GHS",
    currencyScale: 2,
    currentPayableReference: overrides.reference ?? "REF-invoice-manual",
    customerBillingAddressLines: null,
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
    paymentMethod: null,
    reference: "REF-invoice-manual",
    replacementInvoiceId: null,
    replacementInvoiceReference: null,
    revisionCreditNoteId: null,
    revisionCreditNoteReference: null,
    revisionRootInvoiceId: null,
    revisionRootReference: null,
    role: "standard",
    status: "confirmed",
    subtotalAmount: "12.50",
    taxAmount: "0.00",
    totalAmount: "12.50",
    type: "manual",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}
