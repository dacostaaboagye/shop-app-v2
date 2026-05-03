import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  DeliveryEligibleOnlineOrder,
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
  DeliveryResponse,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORIGIN_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const DESTINATION_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

describe("delivery creation route origin authorization", () => {
  it("rejects POS delivery creation for a foreign source origin before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      posSaleSourcePort: {
        async findByInvoiceReference(reference) {
          events.push(`source:${reference}`);
          return posSaleSource(reference);
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        invoiceReference: "INV/2026/000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-sale",
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_sale:any_active",
      "source:INV/2026/000001",
      `route:deliveries.create_from_sale:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("rejects transfer delivery creation for a foreign source origin before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      transferSourcePort: {
        async findByTransferReference(reference) {
          events.push(`source:${reference}`);
          return transferSource(reference);
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        transferReference: "TRF-2026-000001",
      },
      url: "/api/deliveries/from-transfer",
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_transfer:any_active",
      "source:TRF-2026-000001",
      `route:deliveries.create_from_transfer:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("keeps the online-order creation route as a not-found placeholder without invoking service code", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      onlineOrderSourcePort: {
        async findByOrderReference(reference) {
          events.push(`source:${reference}`);
          return null;
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        orderReference: "WEB-2026-000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-online-order",
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_online_order:any_active",
      "source:WEB-2026-000001",
    ]);
  });

  it("creates an online-order delivery after resolving origin-scoped permission", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      allowRoutePermission: true,
      events,
      onlineOrderSourcePort: {
        async findByOrderReference(reference) {
          events.push(`source:${reference}`);
          return onlineOrderSource(reference);
        },
      },
      onlineOrderResponse: deliveryResponse("WEB-2026-000001"),
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        orderReference: "WEB-2026-000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-online-order",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().sourceReference, "WEB-2026-000001");
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_online_order:any_active",
      "source:WEB-2026-000001",
      `route:deliveries.create_from_online_order:contextual:${ORIGIN_LOCATION_ID}`,
      "service:WEB-2026-000001",
    ]);
  });

  it("rejects status transitions for a foreign delivery origin before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      deliveryRecord: deliveryRecord(),
      events,
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        assignedUserId: "88888888-8888-4888-8888-888888888888",
      },
      url: "/api/deliveries/66666666-6666-4666-8666-666666666666/assign",
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.assign:any_active",
      "query:66666666-6666-4666-8666-666666666666",
      `route:deliveries.assign:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("runs a status transition only after delivery-origin permission passes", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      allowRoutePermission: true,
      deliveryRecord: deliveryRecord(),
      events,
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        assignedUserId: "88888888-8888-4888-8888-888888888888",
      },
      url: "/api/deliveries/66666666-6666-4666-8666-666666666666/assign",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "transitioned");
    assert.deepEqual(events, [
      "middleware:deliveries.assign:any_active",
      "query:66666666-6666-4666-8666-666666666666",
      `route:deliveries.assign:contextual:${ORIGIN_LOCATION_ID}`,
      "status-service:assign",
    ]);
  });
});
function createDeliveryRouteServer(input: {
  allowRoutePermission?: boolean;
  deliveryRecord?: DeliveryRecord;
  events: string[];
  onlineOrderResponse?: DeliveryResponse;
  onlineOrderSourcePort?: OnlineOrderDeliverySourcePort;
  posSaleSourcePort?: PosSaleDeliverySourcePort;
  transferSourcePort?: TransferDeliverySourcePort;
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "foreign-manager" };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `middleware:${args.permission}:${args.scope ?? "contextual"}`,
          );
          if (args.scope === "any_active") return;
          if (args.permission === "deliveries.create_from_online_order") return;
          throw permissionDenied();
        },
      },
    },
    deliveries: {
      deliveryCreationService: {
        async createFromOnlineOrder(args) {
          if (input.onlineOrderResponse) {
            input.events.push(`service:${args.orderReference}`);
            return {
              delivery: {
                ...input.onlineOrderResponse,
                assignedAt: null,
                assignedBy: null,
                cancelledAt: null,
                cancelledBy: null,
                completedAt: null,
                completedBy: null,
                createdAt: new Date(input.onlineOrderResponse.createdAt),
                dispatchedAt: null,
                dispatchedBy: null,
              },
              status: "created",
            };
          }
          throw serviceMustNotRun();
        },
        async createFromPosSale() {
          throw serviceMustNotRun();
        },
        async createFromTransfer() {
          throw serviceMustNotRun();
        },
      },
      deliveryQueryService: {
        async findById(deliveryId) {
          input.events.push(`query:${deliveryId}`);
          return input.deliveryRecord ?? null;
        },
        async listByAgent() {
          throw unused();
        },
        async listByLocation() {
          throw unused();
        },
      },
      deliveryStatusService: {
        async assign() {
          input.events.push("status-service:assign");
          const record = input.deliveryRecord ?? deliveryRecord();
          return {
            delivery: {
              ...record,
              status: "assigned",
              assignedUserId: "88888888-8888-4888-8888-888888888888",
              assignedAt: new Date("2026-05-03T10:00:00.000Z"),
            },
            fromStatus: "draft",
            status: "transitioned",
            toStatus: "assigned",
          };
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
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `route:${args.permission}:${args.scope ?? "contextual"}:${args.locationId ?? "none"}`,
          );
          if (input.allowRoutePermission) return;
          throw permissionDenied();
        },
      },
      onlineOrderSourcePort:
        input.onlineOrderSourcePort ??
        ({
          async findByOrderReference() {
            throw unused();
          },
        } satisfies OnlineOrderDeliverySourcePort),
      posSaleSourcePort:
        input.posSaleSourcePort ??
        ({
          async findByInvoiceReference() {
            throw unused();
          },
        } satisfies PosSaleDeliverySourcePort),
      transferSourcePort:
        input.transferSourcePort ??
        ({
          async findByTransferReference() {
            throw unused();
          },
        } satisfies TransferDeliverySourcePort),
    },
  });
}
function onlineOrderSource(reference: string): DeliveryEligibleOnlineOrder {
  return {
    items: [{ quantity: 1, skuId: SKU_ID }],
    locationId: ORIGIN_LOCATION_ID,
    orderReference: reference,
    state: "confirmed",
  };
}
function posSaleSource(reference: string): DeliveryEligiblePosSale {
  return {
    customer: {
      email: null,
      name: "Walk-in customer",
      phone: null,
    },
    invoiceReference: reference,
    items: [{ quantity: 1, skuId: SKU_ID }],
    locationId: ORIGIN_LOCATION_ID,
    state: "confirmed",
  };
}
function deliveryResponse(sourceReference: string): DeliveryResponse {
  return {
    assignedAt: null,
    assignedUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    createdBy: USER_ID,
    deliveryId: "66666666-6666-4666-8666-666666666666",
    destination: { kind: "external", snapshot: deliveryDestination() },
    dispatchedAt: null,
    items: [
      {
        deliveryItemId: "77777777-7777-4777-8777-777777777777",
        itemReference: "DLI-20260501-0001",
        quantity: 1,
        skuId: SKU_ID,
      },
    ],
    originLocationId: ORIGIN_LOCATION_ID,
    sourceReference,
    sourceType: "online_order",
    status: "draft",
  };
}
function deliveryRecord(): DeliveryRecord {
  const response = deliveryResponse("TRF-2026-000001");
  return {
    ...response,
    assignedAt: null,
    assignedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date(response.createdAt),
    dispatchedAt: null,
    dispatchedBy: null,
  };
}
function transferSource(reference: string): DeliveryEligibleTransfer {
  return {
    destinationLocationId: DESTINATION_LOCATION_ID,
    items: [{ quantity: 1, skuId: SKU_ID }],
    skuSnapshot: {
      sku: "SKU-1",
      productName: "Product",
      variantName: "Variant",
    },
    sourceLocationId: ORIGIN_LOCATION_ID,
    state: "approved",
    supplyRequestId: "55555555-5555-4555-8555-555555555555",
    transferReference: reference,
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
function permissionDenied() {
  return new AppError({
    code: "forbidden",
    detail: "Location-scoped delivery creation permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}
function serviceMustNotRun() {
  return new Error("DeliveryCreationService must not run after authz rejects.");
}
function unused() {
  return new Error("Not used by this test.");
}
