import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignDeliveryRequestSchema,
  createDeliveryFromOnlineOrderRequestSchema,
  createDeliveryFromPosSaleRequestSchema,
  createDeliveryFromTransferRequestSchema,
  DELIVERY_ERROR_CODES,
  deliveryAddressSnapshotSchema,
  deliveryResponseSchema,
  deliverySourceTypeSchema,
  reassignDeliveryRequestSchema,
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
  it("uses public references, slugs, and SKU codes", () => {
    const parsed = deliveryResponseSchema.parse(validDeliveryResponse());

    assert.equal(parsed.deliveryReference, "DLV-00001");
    assert.equal(parsed.originLocationSlug, "accra-central");
    assert.equal(parsed.items[0]?.sku, "SKU-ANK-001");
    assert.equal(parsed.assignedUserSlug, null);
    assert.equal(parsed.createdByUserSlug, "manager-ama");
  });

  it("round-trips an external destination", () => {
    const parsed = deliveryResponseSchema.parse(validDeliveryResponse());
    assert.equal(parsed.destination.kind, "external");
  });

  it("does not expose raw internal UUID fields", () => {
    const parsed = deliveryResponseSchema.parse({
      ...validDeliveryResponse(),
      destination: { kind: "location", locationSlug: "kumasi-depot" },
    });

    assertNoRawInternalKeys(parsed, [
      "deliveryId",
      "deliveryItemId",
      "skuId",
      "originLocationId",
      "locationId",
      "assignedUserId",
      "createdBy",
    ]);
    assertNoRawInternalKeys(parsed.destination, ["locationId"]);
    assertNoRawInternalKeys(parsed.items[0] ?? {}, ["deliveryItemId", "skuId"]);
  });

  it("rejects items with quantity 0", () => {
    assert.throws(() =>
      deliveryResponseSchema.parse({
        ...validDeliveryResponse(),
        destination: { kind: "location", locationSlug: "kumasi-depot" },
        items: [
          {
            itemReference: "DEL-20260501-0001",
            sku: "SKU-ANK-001",
            quantity: 0,
          },
        ],
      }),
    );
  });
});

describe("delivery assignment request shapes", () => {
  it("assigns and reassigns by assignedUserSlug", () => {
    const assign = assignDeliveryRequestSchema.parse({
      assignedUserSlug: "agent-kwame",
    });
    const reassign = reassignDeliveryRequestSchema.parse({
      assignedUserSlug: "agent-efua",
    });

    assert.equal(assign.assignedUserSlug, "agent-kwame");
    assert.equal(reassign.assignedUserSlug, "agent-efua");
  });

  it("rejects assignment payloads that only provide an internal user ID", () => {
    assert.throws(() =>
      assignDeliveryRequestSchema.parse({
        assignedUserId: "00000000-0000-4000-8000-000000000001",
      }),
    );
    assert.throws(() =>
      reassignDeliveryRequestSchema.parse({
        assignedUserId: "00000000-0000-4000-8000-000000000001",
      }),
    );
  });
});

describe("delivery error codes", () => {
  it("exposes the delivery error codes", () => {
    assert.deepEqual(Object.values(DELIVERY_ERROR_CODES).sort(), [
      "delivery_agent_not_eligible",
      "delivery_assignment_required",
      "delivery_cancellation_reason_required",
      "delivery_illegal_status_transition",
      "delivery_insufficient_origin_stock",
      "delivery_invalid_destination",
      "delivery_invalid_source_quantity",
      "delivery_partial_unsupported",
      "delivery_reassignment_not_allowed",
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

function validDeliveryResponse() {
  return {
    deliveryReference: "DLV-00001",
    sourceType: "pos_sale",
    sourceReference: "INV-POS-00001",
    status: "draft",
    originLocationSlug: "accra-central",
    destination: { kind: "external", snapshot: validSnapshot },
    items: [
      {
        itemReference: "DEL-20260501-0001",
        sku: "SKU-ANK-001",
        quantity: 2,
      },
    ],
    assignedUserSlug: null,
    assignedAt: null,
    dispatchedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: "2026-05-01T10:00:00.000Z",
    createdByUserSlug: "manager-ama",
  };
}

function assertNoRawInternalKeys(
  value: Record<string, unknown>,
  forbiddenKeys: string[],
) {
  for (const key of forbiddenKeys) {
    assert.equal(Object.hasOwn(value, key), false);
  }
}
