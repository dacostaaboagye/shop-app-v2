import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DELIVERY_ID = "66666666-6666-4666-8666-666666666666";
const DELIVERY_REFERENCE = "DLV-00001";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const LOCATION_SLUG = "main-store";
const SECOND_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_LOCATION_SLUG = "warehouse";
const AGENT_USER_ID = USER_ID;
const AGENT_USER_SLUG = "manager-user";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

describe("delivery query route authorization", () => {
  it("checks contextual location permission before listing by location slug", async () => {
    const events: string[] = [];
    const server = createDeliveryQueryAuthServer({ events });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?locationSlug=${LOCATION_SLUG}`,
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.view:any_active:none",
      `route:deliveries.view:contextual:${LOCATION_ID}`,
    ]);
  });

  it("checks origin permission before returning a delivery by reference", async () => {
    const events: string[] = [];
    const server = createDeliveryQueryAuthServer({
      allowRoutePermission: true,
      events,
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries/${DELIVERY_REFERENCE}`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(events, [
      "middleware:deliveries.view:any_active:none",
      `query:${DELIVERY_REFERENCE}`,
      `route:deliveries.view:contextual:${LOCATION_ID}`,
    ]);
  });

  it("checks every returned origin before listing by agent", async () => {
    const events: string[] = [];
    const server = createDeliveryQueryAuthServer({
      allowRoutePermission: true,
      events,
      records: [
        deliveryRecord({ deliveryId: DELIVERY_ID }),
        deliveryRecord({
          deliveryId: "88888888-8888-4888-8888-888888888888",
          deliveryReference: "DLV-00002",
          originLocationId: SECOND_LOCATION_ID,
          originLocationSlug: SECOND_LOCATION_SLUG,
        }),
      ],
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?agentUserSlug=${AGENT_USER_SLUG}`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(events, [
      "middleware:deliveries.view:any_active:none",
      `list-agent:${AGENT_USER_ID}`,
      `route:deliveries.view:contextual:${LOCATION_ID}`,
      `route:deliveries.view:contextual:${SECOND_LOCATION_ID}`,
    ]);
  });
});

function createDeliveryQueryAuthServer(input: {
  allowRoutePermission?: boolean;
  events: string[];
  records?: DeliveryRecord[];
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "manager-user" };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `middleware:${args.permission}:${args.scope ?? "contextual"}:${args.locationId ?? "none"}`,
          );
        },
      },
    },
    deliveries: {
      deliveryCreationService: {
        async createFromOnlineOrder() {
          throw unused();
        },
        async createFromPosSale() {
          throw unused();
        },
        async createFromTransfer() {
          throw unused();
        },
      },
      deliveryPublicIdentifierResolver: {
        async findLocationIdBySlug(slug) {
          return slug === LOCATION_SLUG ? LOCATION_ID : null;
        },
        async findUserIdBySlug() {
          throw unused();
        },
      },
      deliveryQueryService: {
        async findById(deliveryId) {
          input.events.push(`query:${deliveryId}`);
          return deliveryRecord();
        },
        async findByReference(deliveryReference) {
          input.events.push(`query:${deliveryReference}`);
          return deliveryRecord();
        },
        async hasSkuHistory() {
          throw unused();
        },
        async listByAgent(queryInput) {
          input.events.push(`list-agent:${queryInput.agentUserId}`);
          return input.records ?? [deliveryRecord()];
        },
        async listByLocation(queryInput) {
          input.events.push(`list-location:${queryInput.locationId}`);
          return input.records ?? [deliveryRecord()];
        },
      },
      deliveryStatusService: {
        async assign() {
          throw unused();
        },
        async cancel() {
          throw unused();
        },
        async complete() {
          throw unused();
        },
        async dispatch() {
          throw unused();
        },
        async reassign() {
          throw unused();
        },
      },
      onlineOrderSourcePort: {
        async findByOrderReference() {
          throw unused();
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `route:${args.permission}:${args.scope ?? "contextual"}:${args.locationId ?? "none"}`,
          );
          if (input.allowRoutePermission) return;
          throw permissionDenied();
        },
      },
      posSaleSourcePort: {
        async findByInvoiceReference() {
          throw unused();
        },
      },
      transferSourcePort: {
        async findByTransferReference() {
          throw unused();
        },
      },
    },
  });
}

function deliveryRecord(
  overrides: Partial<DeliveryRecord> = {},
): DeliveryRecord {
  return {
    assignedAt: new Date("2026-05-01T10:00:00.000Z"),
    assignedBy: USER_ID,
    assignedUserId: AGENT_USER_ID,
    assignedUserSlug: AGENT_USER_SLUG,
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    createdBy: USER_ID,
    createdBySlug: "creator-user",
    deliveryId: DELIVERY_ID,
    deliveryReference: DELIVERY_REFERENCE,
    destination: {
      kind: "location",
      locationId: SECOND_LOCATION_ID,
      locationSlug: SECOND_LOCATION_SLUG,
    },
    dispatchedAt: null,
    dispatchedBy: null,
    items: [
      {
        deliveryItemId: "99999999-9999-4999-8999-999999999999",
        itemReference: "DEL-20260501-1",
        quantity: 1,
        sku: "SKU-1",
        skuId: "44444444-4444-4444-8444-444444444444",
      },
    ],
    originLocationId: LOCATION_ID,
    originLocationSlug: LOCATION_SLUG,
    sourceReference: "TRF-2026-000001",
    sourceType: "transfer",
    status: "assigned",
    ...overrides,
  };
}

function permissionDenied() {
  return new AppError({
    code: "forbidden",
    detail: "Location-scoped delivery view permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}

function unused() {
  return new Error("Not used by this test.");
}
