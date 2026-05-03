import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
} from "@shop/contracts";
import { DeliveryCreationCompose } from "../src/modules/deliveries/delivery-creation.compose.js";
import type { DeliveryCreationStockSideEffectsPort } from "../src/modules/deliveries/delivery-creation.contracts.js";
import { PostgresDeliveryStockSideEffectsParticipant } from "../src/modules/stock/delivery-stock-side-effects.participant.js";
import { FakeDeliveryDatabase } from "./delivery-creation-fake-db.test-helper.js";

const NOW = new Date("2026-05-01T00:00:00.000Z");
const CREATED_BY = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";
const ORIGIN_ID = "33333333-3333-4333-8333-333333333333";
const DESTINATION_ID = "66666666-6666-4666-8666-666666666666";

describe("DeliveryCreationCompose transaction behavior", () => {
  it("returns the existing delivery for duplicate source creation", async () => {
    const db = new FakeDeliveryDatabase();
    const compose = buildCompose(db);

    const first = await compose.createFromPosSale(posSaleInput());
    const second = await compose.createFromPosSale(posSaleInput());

    assert.equal(first.status, "created");
    assert.equal(second.status, "noop");
    assert.equal(second.delivery.deliveryId, first.delivery.deliveryId);
    assert.equal(db.state.deliveries.length, 1);
    assert.equal(db.state.items.length, 1);
  });

  it("returns an existing delivery without revalidating mutable source state", async () => {
    const db = new FakeDeliveryDatabase();
    db.seedExisting("pos_sale", "INV-POS-0001");
    const compose = buildCompose(db, {
      posSaleSourcePort: {
        async findByInvoiceReference() {
          throw new Error("source should not be re-read for idempotency");
        },
      },
    });

    const result = await compose.createFromPosSale(posSaleInput());

    assert.equal(result.status, "noop");
    assert.equal(result.delivery.sourceReference, "INV-POS-0001");
    assert.equal(db.transactionCount, 1);
  });

  it("returns the concurrent winner after a source unique race", async () => {
    const db = new FakeDeliveryDatabase();
    db.failNextDeliverySourceUniqueWithWinner();
    const compose = buildCompose(db);

    const result = await compose.createFromPosSale(posSaleInput());

    assert.equal(result.status, "noop");
    assert.equal(result.delivery.sourceReference, "INV-POS-0001");
    assert.equal(db.state.deliveries.length, 1);
    assert.equal(db.state.items.length, 1);
    assert.equal(db.transactionCount, 3);
  });

  it("retries item reference collisions at the outer transaction boundary", async () => {
    const db = new FakeDeliveryDatabase();
    db.failNextItemReferenceUnique();
    const compose = buildCompose(db, {
      references: ["DLI-COLLISION", "DLI-UNIQUE"],
    });

    const result = await compose.createFromPosSale(posSaleInput());

    assert.equal(result.status, "created");
    assert.equal(result.delivery.items[0]?.itemReference, "DLI-UNIQUE");
    assert.equal(db.state.deliveries.length, 1);
    assert.equal(db.state.items.length, 1);
    assert.equal(db.transactionCount, 3);
  });

  it("rolls back transfer delivery and item rows when stock side effects fail", async () => {
    const db = new FakeDeliveryDatabase();
    const compose = buildCompose(db, {
      stockSideEffectsPort: {
        async applyWithinTransaction() {
          throw new Error("stock failure");
        },
      },
      transferSourcePort: {
        async findByTransferReference() {
          return transferSource();
        },
      },
    });

    await assert.rejects(() => compose.createFromTransfer(transferInput()), {
      message: "stock failure",
    });

    assert.equal(db.state.deliveries.length, 0);
    assert.equal(db.state.items.length, 0);
  });

  it("rolls back delivery and stock rows when transfer GTN evidence fails", async () => {
    const db = new FakeDeliveryDatabase();
    db.seedStockBalance({
      locationId: ORIGIN_ID,
      onHandQuantity: 5,
      skuId: SKU_ID,
    });
    db.failNextGoodsTransferNoteInsert();
    const compose = buildCompose(db, {
      stockSideEffectsPort: new PostgresDeliveryStockSideEffectsParticipant(),
      transferSourcePort: {
        async findByTransferReference() {
          return transferSource();
        },
      },
    });

    await assert.rejects(() => compose.createFromTransfer(transferInput()), {
      message: "gtn failure",
    });

    assert.equal(db.state.deliveries.length, 0);
    assert.equal(db.state.items.length, 0);
    assert.equal(db.state.movements.length, 0);
    assert.equal(db.state.reservations.length, 0);
    assert.equal(db.state.gtns.length, 0);
    assert.equal(db.state.stockBalances[0]?.onHandQuantity, 5);
    assert.equal(db.state.stockBalances[0]?.reservedQuantity, 0);
  });
});

function buildCompose(
  db: FakeDeliveryDatabase,
  input: {
    posSaleSourcePort?: {
      findByInvoiceReference(
        reference: string,
      ): Promise<DeliveryEligiblePosSale | null>;
    };
    references?: string[];
    stockSideEffectsPort?: DeliveryCreationStockSideEffectsPort;
    transferSourcePort?: {
      findByTransferReference(
        reference: string,
      ): Promise<DeliveryEligibleTransfer | null>;
    };
  } = {},
) {
  const references = input.references ?? ["DLI-20260501-0001"];
  return new DeliveryCreationCompose({
    db: db as never,
    onlineOrderSourcePort: {
      async findByOrderReference() {
        return null;
      },
    },
    posSaleSourcePort:
      input.posSaleSourcePort ??
      ({
        async findByInvoiceReference() {
          return posSaleSource();
        },
      } satisfies {
        findByInvoiceReference(
          reference: string,
        ): Promise<DeliveryEligiblePosSale | null>;
      }),
    referenceNumberService: {
      async generateReference() {
        const reference = references.shift() ?? "DLI-20260501-0001";
        return reference;
      },
    } as never,
    stockSideEffectsPort: input.stockSideEffectsPort ?? okStockSideEffectsPort,
    transferSourcePort:
      input.transferSourcePort ??
      ({
        async findByTransferReference() {
          return null;
        },
      } satisfies {
        findByTransferReference(
          reference: string,
        ): Promise<DeliveryEligibleTransfer | null>;
      }),
  });
}

function posSaleInput() {
  return {
    createdBy: CREATED_BY,
    destination: deliveryDestination(),
    invoiceReference: "INV-POS-0001",
    now: NOW,
  };
}

function transferInput() {
  return {
    createdBy: CREATED_BY,
    now: NOW,
    transferReference: "TRF-2026-0001",
  };
}

function posSaleSource(): DeliveryEligiblePosSale {
  return {
    customer: { email: null, name: null, phone: null },
    invoiceReference: "INV-POS-0001",
    items: [{ quantity: 1, skuId: SKU_ID }],
    locationId: ORIGIN_ID,
    state: "confirmed",
  };
}

function transferSource(): DeliveryEligibleTransfer {
  return {
    destinationLocationId: DESTINATION_ID,
    items: [{ quantity: 1, skuId: SKU_ID }],
    skuSnapshot: {
      productName: "Product",
      sku: "SKU-1",
      variantName: "Variant",
    },
    sourceLocationId: ORIGIN_ID,
    state: "approved",
    supplyRequestId: "77777777-7777-4777-8777-777777777777",
    transferReference: "TRF-2026-0001",
  };
}

function deliveryDestination() {
  return {
    addressLines: ["12 Market Street"],
    city: "Accra",
    contactEmail: null,
    contactName: "Adwoa Mensah",
    contactPhone: "+233200000000",
    countryCode: "GH",
    notes: null,
    postalCode: null,
    region: null,
  };
}

const okStockSideEffectsPort = {
  async applyWithinTransaction() {
    return { status: "ok" as const };
  },
} satisfies DeliveryCreationStockSideEffectsPort;
