import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import { PosSaleService } from "../src/modules/sales/pos-sale.service.js";
import type {
  CreateReturnTransactionInput,
  CreateSaleTransactionInput,
  InvoiceWithLines,
} from "../src/modules/sales/sales.contracts.js";

const NOW = new Date("2026-04-26T14:00:00.000Z");

describe("PosSaleService currency snapshots", () => {
  it("resolves and persists the current location currency on sale", async () => {
    let createdSaleInput: CreateSaleTransactionInput | null = null;
    const service = new PosSaleService({
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
        async createReturnTransaction() {
          throw new Error("Not expected in this test.");
        },
        async createSaleTransaction(input) {
          createdSaleInput = input;
          return invoice({
            currencyCode: input.currencyCode,
            currencyScale: input.currencyScale,
            locationId: input.locationId,
            reference: input.reference,
          });
        },
        async findByReference() {
          return null;
        },
      },
      referenceNumberService: {
        generateCreditNoteReference() {
          return "CN/2026/000001";
        },
        async generateReference() {
          return "INV/2026/000001";
        },
      },
      salesAttributionService: {
        async attributeSale() {
          return { workerId: "worker-1" };
        },
      },
    });

    const invoiceResult = await service.processSale({
      createdBy: "user-1",
      lines: [{ quantity: 2, skuId: "sku-1" }],
      locationId: "location-1",
      now: NOW,
      paymentMethod: "cash",
    });

    assert.ok(createdSaleInput);
    const persistedSale = createdSaleInput as CreateSaleTransactionInput;
    assert.equal(persistedSale.currencyCode, "GHS");
    assert.equal(persistedSale.currencyScale, 2);
    assert.equal(invoiceResult.currencyCode, "GHS");
    assert.equal(invoiceResult.currencyScale, 2);
  });

  it("reuses the parent invoice currency snapshot on return", async () => {
    let createdReturnInput: CreateReturnTransactionInput | null = null;
    const service = new PosSaleService({
      catalogVariantRepository: {
        async getVariantsForSale() {
          return new Map();
        },
      },
      currencyResolver: {
        async resolveCurrencySnapshot() {
          return { currencyCode: "USD", currencyScale: 2 };
        },
      },
      invoiceRepository: {
        async createReturnTransaction(input) {
          createdReturnInput = input;
          return invoice({
            currencyCode: input.currencyCode,
            currencyScale: input.currencyScale,
            locationId: input.locationId,
            parentInvoiceId: input.parentInvoiceId,
            reference: input.reference,
            type: "credit_note",
          });
        },
        async createSaleTransaction() {
          throw new Error("Not expected in this test.");
        },
        async findByReference() {
          return invoice({
            attributedWorkerId: "worker-1",
            createdBy: "worker-1",
            currencyCode: "GHS",
            currencyScale: 2,
            lines: [
              {
                createdAt: NOW,
                id: "line-1",
                invoiceId: "invoice-1",
                lineTotal: "12.50",
                quantity: 1,
                skuId: "sku-1",
                skuSnapshot: {
                  productName: "Bottled Water",
                  sku: "BW-L",
                  variantName: "Large",
                },
                stockMovementId: null,
                taxAmount: "0.00",
                taxCategory: null,
                taxRate: null,
                unitPrice: "12.50",
                updatedAt: NOW,
              },
            ],
            locationId: "location-1",
            reference: "INV/2026/000001",
          });
        },
      },
      referenceNumberService: {
        generateCreditNoteReference() {
          return "CN/2026/000001";
        },
        async generateReference() {
          return "INV/2026/000001";
        },
      },
      salesAttributionService: {
        async attributeSale() {
          return { workerId: "worker-1" };
        },
      },
    });

    const creditNote = await service.processReturn({
      createdBy: "user-1",
      lines: [{ quantity: 1, skuId: "sku-1" }],
      now: NOW,
      parentReference: "INV/2026/000001",
      reason: "Damaged item",
    });

    assert.ok(createdReturnInput);
    const persistedReturn = createdReturnInput as CreateReturnTransactionInput;
    assert.equal(persistedReturn.currencyCode, "GHS");
    assert.equal(persistedReturn.currencyScale, 2);
    assert.equal(creditNote.currencyCode, "GHS");
    assert.equal(creditNote.currencyScale, 2);
  });

  it("rounds custom sale pricing into persisted line and invoice totals", async () => {
    let createdSaleInput: CreateSaleTransactionInput | null = null;
    const service = createService({
      async createSaleTransaction(input) {
        createdSaleInput = input;
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          lines: [],
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
        });
      },
    });

    const result = await service.processSale({
      createdBy: "user-1",
      lines: [{ quantity: 3, skuId: "sku-1", unitPrice: "10.236" }],
      locationId: "location-1",
      now: NOW,
      paymentMethod: "cash",
    });

    assert.ok(createdSaleInput);
    const roundedSale = createdSaleInput as CreateSaleTransactionInput;
    assert.equal(roundedSale.lineItems[0]?.unitPrice, "10.24");
    assert.equal(roundedSale.lineItems[0]?.lineTotal, "30.71");
    assert.equal(roundedSale.subtotalAmount, "30.71");
    assert.equal(roundedSale.taxAmount, "0.00");
    assert.equal(roundedSale.totalAmount, "30.71");
    assert.equal(result.subtotalAmount, "30.71");
    assert.equal(result.totalAmount, "30.71");
  });

  it("falls back to the catalog selling price when custom price input is invalid", async () => {
    let createdSaleInput: CreateSaleTransactionInput | null = null;
    const service = createService({
      async createSaleTransaction(input) {
        createdSaleInput = input;
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          lines: [],
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
        });
      },
    });

    await service.processSale({
      createdBy: "user-1",
      lines: [{ quantity: 2, skuId: "sku-1", unitPrice: "invalid-price" }],
      locationId: "location-1",
      now: NOW,
      paymentMethod: "cash",
    });

    assert.ok(createdSaleInput);
    const fallbackSale = createdSaleInput as CreateSaleTransactionInput;
    assert.equal(fallbackSale.lineItems[0]?.unitPrice, "12.50");
    assert.equal(fallbackSale.lineItems[0]?.lineTotal, "25.00");
    assert.equal(fallbackSale.subtotalAmount, "25.00");
    assert.equal(fallbackSale.totalAmount, "25.00");
  });

  it("persists optional buyer details when they are provided", async () => {
    let createdSaleInput: CreateSaleTransactionInput | null = null;
    const service = createService({
      async createSaleTransaction(input) {
        createdSaleInput = input;
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          customerBillingAddressLines:
            input.customerBillingAddressLines ?? null,
          customerEmail: input.customerEmail ?? null,
          customerName: input.customerName ?? null,
          customerPhone: input.customerPhone ?? null,
          customerTaxNumber: input.customerTaxNumber ?? null,
          lines: [],
        });
      },
    });

    const result = await service.processSale({
      createdBy: "user-1",
      customerBillingAddressLines: ["12 Market Street", "Accra"],
      customerEmail: "buyer@example.com",
      customerName: "Adwoa Mensah",
      customerPhone: "+233200000000",
      customerTaxNumber: "TIN-123",
      lines: [{ quantity: 1, skuId: "sku-1" }],
      locationId: "location-1",
      now: NOW,
      paymentMethod: "cash",
    });

    assert.ok(createdSaleInput);
    const persistedSale = createdSaleInput as CreateSaleTransactionInput;
    assert.equal(persistedSale.customerName, "Adwoa Mensah");
    assert.equal(persistedSale.customerEmail, "buyer@example.com");
    assert.deepEqual(persistedSale.customerBillingAddressLines, [
      "12 Market Street",
      "Accra",
    ]);
    assert.equal(result.customerName, "Adwoa Mensah");
  });

  it("calculates return totals from the original invoice unit price", async () => {
    let createdReturnInput: CreateReturnTransactionInput | null = null;
    const service = createService({
      async createReturnTransaction(input) {
        createdReturnInput = input;
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          lines: [],
          parentInvoiceId: input.parentInvoiceId,
          reference: input.reference,
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          type: "credit_note",
        });
      },
      findByReference: async () =>
        invoice({
          attributedWorkerId: "worker-1",
          createdBy: "worker-1",
          currencyCode: "GHS",
          currencyScale: 2,
          lines: [
            {
              createdAt: NOW,
              id: "line-1",
              invoiceId: "invoice-1",
              lineTotal: "30.72",
              quantity: 3,
              skuId: "sku-1",
              skuSnapshot: {
                productName: "Bottled Water",
                sku: "BW-L",
                variantName: "Large",
              },
              stockMovementId: null,
              taxAmount: "0.00",
              taxCategory: null,
              taxRate: null,
              unitPrice: "10.24",
              updatedAt: NOW,
            },
          ],
          locationId: "location-1",
          reference: "INV/2026/000001",
        }),
    });

    const creditNote = await service.processReturn({
      createdBy: "user-1",
      lines: [{ quantity: 2, skuId: "sku-1" }],
      now: NOW,
      parentReference: "INV/2026/000001",
      reason: "Customer return",
    });

    assert.ok(createdReturnInput);
    const roundedReturn = createdReturnInput as CreateReturnTransactionInput;
    assert.equal(roundedReturn.lines[0]?.unitPrice, "10.24");
    assert.equal(roundedReturn.lines[0]?.lineTotal, "20.48");
    assert.equal(roundedReturn.subtotalAmount, "20.48");
    assert.equal(roundedReturn.taxAmount, "0.00");
    assert.equal(roundedReturn.totalAmount, "20.48");
    assert.equal(creditNote.subtotalAmount, "20.48");
    assert.equal(creditNote.totalAmount, "20.48");
  });

  it("publishes a durable event after processing a return", async () => {
    const events: PlatformEventRecord[] = [];
    const service = createService({
      async getLocationName() {
        return "Downtown Store";
      },
      platformEventPublisher: {
        async publish(event) {
          events.push(event);
        },
      },
    });

    await service.processReturn({
      actor: { userSlug: "worker-user" },
      createdBy: "user-1",
      lines: [{ quantity: 1, skuId: "sku-1" }],
      now: NOW,
      parentReference: "INV/2026/000001",
      reason: "Customer return",
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "sales.return.processed");
    assert.equal(
      events[0]?.summary,
      "Sales return processed at Downtown Store: CN/2026/000001 issued against INV/2026/000001 for GHS 12.50.",
    );
  });
});

function invoice(overrides: Partial<InvoiceWithLines> = {}): InvoiceWithLines {
  return {
    attributedWorkerEmail: "worker@example.com",
    attributedWorkerId: "worker-1",
    attributedWorkerName: "Store Worker",
    confirmedAt: NOW,
    createdAt: NOW,
    createdBy: "user-1",
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
    paymentMethod: "cash",
    reference: "INV/2026/000001",
    status: "confirmed",
    subtotalAmount: "25.00",
    taxAmount: "0.00",
    totalAmount: "25.00",
    type: "pos",
    updatedAt: NOW,
    voidedAt: null,
    voidReason: null,
    ...overrides,
  };
}

function createService(
  overrides: Partial<{
    createReturnTransaction: (
      input: CreateReturnTransactionInput,
    ) => Promise<InvoiceWithLines>;
    createSaleTransaction: (
      input: CreateSaleTransactionInput,
    ) => Promise<InvoiceWithLines>;
    findByReference: (reference: string) => Promise<InvoiceWithLines | null>;
    getLocationName: (locationId: string) => Promise<string>;
    platformEventPublisher: {
      publish: (event: PlatformEventRecord) => Promise<void>;
    };
  }> = {},
) {
  return new PosSaleService({
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
      async createReturnTransaction(input) {
        if (overrides.createReturnTransaction) {
          return overrides.createReturnTransaction(input);
        }
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          lines: [],
          parentInvoiceId: input.parentInvoiceId,
          reference: input.reference,
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          type: "credit_note",
        });
      },
      async createSaleTransaction(input) {
        if (overrides.createSaleTransaction) {
          return overrides.createSaleTransaction(input);
        }
        return invoice({
          currencyCode: input.currencyCode,
          currencyScale: input.currencyScale,
          lines: [],
          locationId: input.locationId,
          reference: input.reference,
          subtotalAmount: input.subtotalAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
        });
      },
      async findByReference(reference) {
        if (overrides.findByReference) {
          return overrides.findByReference(reference);
        }
        return reference === "INV/2026/000001"
          ? invoice({
              attributedWorkerId: "worker-1",
              createdBy: "worker-1",
              currencyCode: "GHS",
              currencyScale: 2,
              lines: [
                {
                  createdAt: NOW,
                  id: "line-1",
                  invoiceId: "invoice-1",
                  lineTotal: "12.50",
                  quantity: 1,
                  skuId: "sku-1",
                  skuSnapshot: {
                    productName: "Bottled Water",
                    sku: "BW-L",
                    variantName: "Large",
                  },
                  stockMovementId: null,
                  taxAmount: "0.00",
                  taxCategory: null,
                  taxRate: null,
                  unitPrice: "12.50",
                  updatedAt: NOW,
                },
              ],
              locationId: "location-1",
              reference: "INV/2026/000001",
            })
          : null;
      },
    },
    ...(overrides.platformEventPublisher
      ? { platformEventPublisher: overrides.platformEventPublisher }
      : {}),
    referenceNumberService: {
      generateCreditNoteReference() {
        return "CN/2026/000001";
      },
      async generateReference() {
        return "INV/2026/000001";
      },
    },
    salesEventContextRepository: {
      async getLocationName(locationId) {
        if (overrides.getLocationName) {
          return overrides.getLocationName(locationId);
        }
        return "Downtown Store";
      },
    },
    salesAttributionService: {
      async attributeSale() {
        return { workerId: "worker-1" };
      },
    },
  });
}
