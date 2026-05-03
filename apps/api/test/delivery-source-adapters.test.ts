import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDeliveriesRuntime } from "../src/modules/deliveries/create-deliveries-runtime.js";
import { PosSaleDeliverySourceAdapter } from "../src/modules/sales/pos-sale-delivery-source.adapter.js";
import type { InvoiceWithLines } from "../src/modules/sales/sales.contracts.js";
import {
  PostgresStockTransferDeliverySourceLookup,
  TransferDeliverySourceAdapter,
} from "../src/modules/stock/transfer-delivery-source.adapter.js";

const saleInvoice = {
  attributedWorkerId: null,
  attributedWorkerName: null,
  attributedWorkerEmail: null,
  classification: "outgoing",
  confirmedAt: new Date("2026-05-01T10:00:00Z"),
  createdAt: new Date("2026-05-01T10:00:00Z"),
  createdBy: "00000000-0000-4000-8000-000000000001",
  currentPayableReference: "INV-POS-0001",
  customerBillingAddressLines: null,
  currencyCode: "GHS",
  currencyScale: 2,
  customerEmail: "ada@example.com",
  customerName: "Ada Mensah",
  customerPhone: "+233200000000",
  customerTaxNumber: null,
  id: "00000000-0000-4000-8000-000000000010",
  locationId: "00000000-0000-4000-8000-000000000020",
  notes: null,
  parentInvoiceId: null,
  parentInvoiceReference: null,
  paymentMethod: "cash",
  reference: "INV-POS-0001",
  replacementInvoiceId: null,
  replacementInvoiceReference: null,
  revisionCreditNoteId: null,
  revisionCreditNoteReference: null,
  revisionRootInvoiceId: null,
  revisionRootReference: null,
  role: "standard",
  status: "confirmed",
  subtotalAmount: "10.00",
  taxAmount: "0.00",
  totalAmount: "10.00",
  type: "pos",
  updatedAt: new Date("2026-05-01T10:00:00Z"),
  voidedAt: null,
  voidReason: null,
  lines: [
    {
      createdAt: new Date("2026-05-01T10:00:00Z"),
      id: "00000000-0000-4000-8000-000000000030",
      invoiceId: "00000000-0000-4000-8000-000000000010",
      lineTotal: "10.00",
      quantity: 2,
      skuId: "00000000-0000-4000-8000-000000000040",
      skuSnapshot: {
        sku: "SKU-1",
        productName: "Product",
        variantName: "Variant",
      },
      stockMovementId: "00000000-0000-4000-8000-000000000050",
      taxAmount: "0.00",
      taxCategory: null,
      taxRate: null,
      unitPrice: "5.00",
      updatedAt: new Date("2026-05-01T10:00:00Z"),
    },
  ],
} satisfies InvoiceWithLines;

const transferSkuSnapshot = {
  sku: "SKU-1",
  productName: "Product",
  variantName: "Variant",
};

describe("PosSaleDeliverySourceAdapter", () => {
  it("maps a POS invoice into the delivery source port shape", async () => {
    const adapter = new PosSaleDeliverySourceAdapter({
      async findByReference(reference) {
        assert.equal(reference, "INV-POS-0001");
        return saleInvoice;
      },
    });

    const result = await adapter.findByInvoiceReference("INV-POS-0001");

    assert.deepEqual(result, {
      invoiceReference: "INV-POS-0001",
      locationId: "00000000-0000-4000-8000-000000000020",
      state: "confirmed",
      items: [
        {
          skuId: "00000000-0000-4000-8000-000000000040",
          quantity: 2,
        },
      ],
      customer: {
        name: "Ada Mensah",
        phone: "+233200000000",
        email: "ada@example.com",
      },
    });
  });

  it("does not treat non-POS invoices as POS delivery sources", async () => {
    const adapter = new PosSaleDeliverySourceAdapter({
      async findByReference() {
        return { ...saleInvoice, type: "manual" };
      },
    });

    assert.equal(await adapter.findByInvoiceReference("INV-MAN-0001"), null);
  });
});

describe("TransferDeliverySourceAdapter", () => {
  it("maps an approved stock transfer into one delivery source item", async () => {
    const adapter = new TransferDeliverySourceAdapter({
      async findByReference(reference) {
        assert.equal(reference, "TRF-0001");
        return {
          approvedQuantity: 3,
          destinationLocationId: "00000000-0000-4000-8000-000000000021",
          reference: "TRF-0001",
          requestedQuantity: 5,
          skuId: "00000000-0000-4000-8000-000000000040",
          skuSnapshot: transferSkuSnapshot,
          sourceLocationId: "00000000-0000-4000-8000-000000000020",
          supplyRequestId: "00000000-0000-4000-8000-000000000060",
          status: "approved",
        };
      },
    });

    const result = await adapter.findByTransferReference("TRF-0001");

    assert.deepEqual(result, {
      transferReference: "TRF-0001",
      sourceLocationId: "00000000-0000-4000-8000-000000000020",
      destinationLocationId: "00000000-0000-4000-8000-000000000021",
      supplyRequestId: "00000000-0000-4000-8000-000000000060",
      skuSnapshot: transferSkuSnapshot,
      state: "approved",
      items: [
        {
          skuId: "00000000-0000-4000-8000-000000000040",
          quantity: 3,
        },
      ],
    });
  });

  it("maps in-transit stock transfers to the dispatched non-eligible state", async () => {
    const adapter = new TransferDeliverySourceAdapter({
      async findByReference() {
        return {
          approvedQuantity: null,
          destinationLocationId: "00000000-0000-4000-8000-000000000021",
          reference: "TRF-0002",
          requestedQuantity: 5,
          skuId: "00000000-0000-4000-8000-000000000040",
          skuSnapshot: transferSkuSnapshot,
          sourceLocationId: "00000000-0000-4000-8000-000000000020",
          supplyRequestId: "00000000-0000-4000-8000-000000000060",
          status: "in_transit",
        };
      },
    });

    assert.equal(
      (await adapter.findByTransferReference("TRF-0002"))?.state,
      "dispatched",
    );
  });
});

describe("createDeliveriesRuntime", () => {
  it("preserves the production warning only for the deliberate online-order stub", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const warnings: Array<{ message: string; meta?: Record<string, unknown> }> =
      [];

    try {
      createDeliveriesRuntime(
        {
          db: { query: { stockTransfers: {} } },
        } as never,
        {
          posSaleSourcePort: {
            async findByInvoiceReference() {
              return null;
            },
          },
          stockSideEffectsPort: {
            async applyWithinTransaction() {
              return { status: "ok" };
            },
          },
          transferSourcePort: {
            async findByTransferReference() {
              return null;
            },
          },
          logger: {
            warn(message, meta) {
              warnings.push(
                meta === undefined ? { message } : { message, meta },
              );
            },
          },
        },
      );
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    assert.deepEqual(warnings, [
      {
        message:
          "deliveries runtime is using the online order stub source adapter in production",
        meta: { onlineOrder: true },
      },
    ]);
  });
});

describe("PostgresStockTransferDeliverySourceLookup", () => {
  it("queries stock transfers by public transfer reference", async () => {
    let requestedReference: string | null = null;
    const lookup = new PostgresStockTransferDeliverySourceLookup({
      query: {
        stockTransfers: {
          async findFirst(input: {
            where: (
              table: { reference: string },
              operators: {
                eq: (
                  left: string,
                  right: string,
                ) => { left: string; right: string };
              },
            ) => unknown;
          }) {
            input.where(
              { reference: "reference-column" },
              {
                eq(left, right) {
                  requestedReference = right;
                  return { left, right };
                },
              },
            );
            return null;
          },
        },
      },
    } as never);

    assert.equal(await lookup.findByReference("TRF-0003"), null);
    assert.equal(requestedReference, "TRF-0003");
  });
});
