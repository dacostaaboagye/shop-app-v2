import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDeliveryFromOnlineOrderRequestSchema,
  createDeliveryFromPosSaleRequestSchema,
  createDeliveryFromTransferRequestSchema,
  DELIVERY_ERROR_CODES,
  deliveryAddressSnapshotSchema,
  deliveryResponseSchema,
  deliverySourceTypeSchema,
} from "./deliveries.js";

const validSnapshot = {
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

describe("delivery source-type contract", () => {
  it("accepts the three known source types", () => {
    assert.deepEqual(deliverySourceTypeSchema.options, [
      "pos_sale",
      "online_order",
      "transfer",
    ]);
  });
});

describe("delivery address snapshot", () => {
  it("accepts a minimal snapshot and applies defaults", () => {
    const parsed = deliveryAddressSnapshotSchema.parse({
      contactName: "Ada",
      contactPhone: "+233200000000",
      addressLines: ["12 Kente Lane"],
      city: "Accra",
      countryCode: "GH",
    });
    assert.equal(parsed.contactEmail, null);
    assert.equal(parsed.region, null);
    assert.equal(parsed.postalCode, null);
    assert.equal(parsed.notes, null);
  });

  it("rejects an empty addressLines array", () => {
    assert.throws(() =>
      deliveryAddressSnapshotSchema.parse({
        contactName: "Ada",
        contactPhone: "+233200000000",
        addressLines: [],
        city: "Accra",
        countryCode: "GH",
      }),
    );
  });

  it("rejects a lowercase or non-2-letter country code", () => {
    assert.throws(() =>
      deliveryAddressSnapshotSchema.parse({
        ...validSnapshot,
        countryCode: "gh",
      }),
    );
    assert.throws(() =>
      deliveryAddressSnapshotSchema.parse({
        ...validSnapshot,
        countryCode: "GHA",
      }),
    );
  });
});

describe("create-delivery request shapes", () => {
  it("pos sale request validates", () => {
    const parsed = createDeliveryFromPosSaleRequestSchema.parse({
      invoiceReference: "INV-POS-00001",
      destination: validSnapshot,
    });
    assert.equal(parsed.invoiceReference, "INV-POS-00001");
  });

  it("online order request validates", () => {
    const parsed = createDeliveryFromOnlineOrderRequestSchema.parse({
      orderReference: "WEB-20260501-0001",
      destination: validSnapshot,
    });
    assert.equal(parsed.orderReference, "WEB-20260501-0001");
  });

  it("transfer request validates with only the reference", () => {
    const parsed = createDeliveryFromTransferRequestSchema.parse({
      transferReference: "TRF-00001",
    });
    assert.equal(parsed.transferReference, "TRF-00001");
  });
});

describe("delivery response shape", () => {
  it("round-trips an external destination", () => {
    const parsed = deliveryResponseSchema.parse({
      deliveryId: "00000000-0000-4000-8000-000000000001",
      sourceType: "pos_sale",
      sourceReference: "INV-POS-00001",
      status: "draft",
      originLocationId: "00000000-0000-4000-8000-000000000002",
      destination: { kind: "external", snapshot: validSnapshot },
      items: [
        {
          deliveryItemId: "00000000-0000-4000-8000-000000000003",
          itemReference: "DEL-20260501-1",
          skuId: "00000000-0000-4000-8000-000000000004",
          quantity: 2,
        },
      ],
      assignedUserId: null,
      assignedAt: null,
      dispatchedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: "2026-05-01T10:00:00.000Z",
      createdBy: "00000000-0000-4000-8000-000000000005",
    });
    assert.equal(parsed.destination.kind, "external");
  });

  it("rejects items with quantity 0", () => {
    assert.throws(() =>
      deliveryResponseSchema.parse({
        deliveryId: "00000000-0000-4000-8000-000000000001",
        sourceType: "transfer",
        sourceReference: "TRF-00001",
        status: "draft",
        originLocationId: "00000000-0000-4000-8000-000000000002",
        destination: {
          kind: "location",
          locationId: "00000000-0000-4000-8000-000000000006",
        },
        items: [
          {
            deliveryItemId: "00000000-0000-4000-8000-000000000003",
            itemReference: "DEL-20260501-1",
            skuId: "00000000-0000-4000-8000-000000000004",
            quantity: 0,
          },
        ],
        assignedUserId: null,
        assignedAt: null,
        dispatchedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: "2026-05-01T10:00:00.000Z",
        createdBy: "00000000-0000-4000-8000-000000000005",
      }),
    );
  });
});

describe("delivery error codes", () => {
  it("exposes the ten error codes", () => {
    assert.deepEqual(Object.values(DELIVERY_ERROR_CODES).sort(), [
      "delivery_assignment_required",
      "delivery_illegal_status_transition",
      "delivery_insufficient_origin_stock",
      "delivery_invalid_destination",
      "delivery_partial_unsupported",
      "delivery_source_conflict",
      "delivery_source_not_found",
      "delivery_source_state_invalid",
      "delivery_status_conflict",
      "delivery_terminal_status",
    ]);
    assert.equal(
      DELIVERY_ERROR_CODES.invalidSourceState,
      "delivery_source_state_invalid",
    );
  });
});
