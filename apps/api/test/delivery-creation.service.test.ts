import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  DeliveryAddressSnapshot,
  DeliveryEligibleOnlineOrder,
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import { DeliveryCreationCompose } from "../src/modules/deliveries/delivery-creation.compose.js";
import type { DeliveryCreationStockSideEffectsPort } from "../src/modules/deliveries/delivery-creation.contracts.js";
import { DeliveryCreationServiceImpl } from "../src/modules/deliveries/delivery-creation.service.js";
import {
  DeliverySourceNotFoundError,
  DeliverySourceStateInvalidError,
} from "../src/modules/deliveries/delivery-errors.js";
import { FakeDeliveryDatabase } from "./delivery-creation-fake-db.test-helper.js";

const validSnapshot: DeliveryAddressSnapshot = {
  contactName: "Ada Mensah",
  contactPhone: "+233200000000",
  contactEmail: null,
  addressLines: ["12 Kente Lane"],
  city: "Accra",
  region: null,
  postalCode: null,
  countryCode: "GH",
  notes: null,
};

class FakePosSalePort implements PosSaleDeliverySourcePort {
  constructor(private readonly result: DeliveryEligiblePosSale | null) {}
  async findByInvoiceReference() {
    return this.result;
  }
}

class FakeOnlineOrderPort implements OnlineOrderDeliverySourcePort {
  constructor(private readonly result: DeliveryEligibleOnlineOrder | null) {}
  async findByOrderReference() {
    return this.result;
  }
}

class FakeTransferPort implements TransferDeliverySourcePort {
  constructor(private readonly result: DeliveryEligibleTransfer | null) {}
  async findByTransferReference() {
    return this.result;
  }
}

const noopStockSideEffectsPort = {
  async applyWithinTransaction() {
    return { status: "ok" as const };
  },
} satisfies DeliveryCreationStockSideEffectsPort;

function buildService(input: {
  posSale?: DeliveryEligiblePosSale | null;
  onlineOrder?: DeliveryEligibleOnlineOrder | null;
  transfer?: DeliveryEligibleTransfer | null;
}) {
  const db = new FakeDeliveryDatabase();
  const compose = new DeliveryCreationCompose({
    db: db as never,
    posSaleSourcePort: new FakePosSalePort(input.posSale ?? null),
    onlineOrderSourcePort: new FakeOnlineOrderPort(input.onlineOrder ?? null),
    transferSourcePort: new FakeTransferPort(input.transfer ?? null),
    stockSideEffectsPort: noopStockSideEffectsPort,
    referenceNumberService: {} as never,
  });
  return new DeliveryCreationServiceImpl(compose);
}

describe("DeliveryCreationService.createFromPosSale", () => {
  it("throws DeliverySourceNotFoundError when the invoice has no sale", async () => {
    const service = buildService({ posSale: null });
    await assert.rejects(
      () =>
        service.createFromPosSale({
          invoiceReference: "INV-POS-0001",
          destination: validSnapshot,
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      DeliverySourceNotFoundError,
    );
  });

  it("throws DeliverySourceStateInvalidError when the sale is voided", async () => {
    const service = buildService({
      posSale: {
        invoiceReference: "INV-POS-0001",
        locationId: "00000000-0000-4000-8000-000000000010",
        state: "voided",
        items: [{ skuId: "00000000-0000-4000-8000-000000000020", quantity: 1 }],
        customer: { name: null, phone: null, email: null },
      },
    });
    await assert.rejects(
      () =>
        service.createFromPosSale({
          invoiceReference: "INV-POS-0001",
          destination: validSnapshot,
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      (error: unknown) => {
        if (!(error instanceof DeliverySourceStateInvalidError)) return false;
        return error.details?.sourceState === "voided";
      },
    );
  });
});

describe("DeliveryCreationService.createFromOnlineOrder", () => {
  it("throws DeliverySourceNotFoundError when the order doesn't exist (stub adapter)", async () => {
    const service = buildService({ onlineOrder: null });
    await assert.rejects(
      () =>
        service.createFromOnlineOrder({
          orderReference: "WEB-20260501-0001",
          destination: validSnapshot,
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      DeliverySourceNotFoundError,
    );
  });

  it("rejects a fulfilled order so we don't re-create the delivery", async () => {
    const service = buildService({
      onlineOrder: {
        orderReference: "WEB-20260501-0001",
        locationId: "00000000-0000-4000-8000-000000000010",
        state: "fulfilled",
        items: [{ skuId: "00000000-0000-4000-8000-000000000020", quantity: 2 }],
      },
    });
    await assert.rejects(
      () =>
        service.createFromOnlineOrder({
          orderReference: "WEB-20260501-0001",
          destination: validSnapshot,
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      DeliverySourceStateInvalidError,
    );
  });
});

describe("DeliveryCreationService.createFromTransfer", () => {
  it("throws DeliverySourceNotFoundError for an unknown transfer", async () => {
    const service = buildService({ transfer: null });
    await assert.rejects(
      () =>
        service.createFromTransfer({
          transferReference: "TRF-0001",
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      DeliverySourceNotFoundError,
    );
  });

  it("rejects a transfer that is not yet approved", async () => {
    const service = buildService({
      transfer: {
        transferReference: "TRF-0001",
        sourceLocationId: "00000000-0000-4000-8000-000000000010",
        destinationLocationId: "00000000-0000-4000-8000-000000000011",
        supplyRequestId: "00000000-0000-4000-8000-000000000012",
        skuSnapshot: {
          sku: "SKU-1",
          productName: "Product",
          variantName: "Variant",
        },
        state: "draft",
        items: [{ skuId: "00000000-0000-4000-8000-000000000020", quantity: 5 }],
      },
    });
    await assert.rejects(
      () =>
        service.createFromTransfer({
          transferReference: "TRF-0001",
          createdBy: "00000000-0000-4000-8000-000000000001",
        }),
      DeliverySourceStateInvalidError,
    );
  });
});
