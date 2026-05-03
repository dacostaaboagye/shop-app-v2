import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import {
  DeliveryAgentNotEligibleError,
  DeliveryReassignmentNotAllowedError,
} from "../src/modules/deliveries/delivery-status.errors.js";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DELIVERY_ID = "66666666-6666-4666-8666-666666666666";
const ORIGIN_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "88888888-8888-4888-8888-888888888888";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

describe("delivery reassign route", () => {
  it("rejects foreign-origin reassign before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryReassignServer({ events });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: { assignedUserId: AGENT_ID },
      url: `/api/deliveries/${DELIVERY_ID}/reassign`,
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.reassign:any_active",
      `query:${DELIVERY_ID}`,
      `route:deliveries.reassign:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("reassigns only after delivery-origin permission passes", async () => {
    const events: string[] = [];
    const server = createDeliveryReassignServer({
      allowRoutePermission: true,
      events,
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: { assignedUserId: AGENT_ID },
      url: `/api/deliveries/${DELIVERY_ID}/reassign`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "transitioned");
    assert.equal(response.json().delivery.assignedUserId, AGENT_ID);
    assert.deepEqual(events, [
      "middleware:deliveries.reassign:any_active",
      `query:${DELIVERY_ID}`,
      `route:deliveries.reassign:contextual:${ORIGIN_LOCATION_ID}`,
      "status-service:reassign",
    ]);
  });

  it("maps ineligible-agent reassign failures to structured 400 responses", async () => {
    const server = createDeliveryReassignServer({
      allowRoutePermission: true,
      serviceError: new DeliveryAgentNotEligibleError({
        deliveryId: DELIVERY_ID,
        userId: AGENT_ID,
      }),
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: { assignedUserId: AGENT_ID },
      url: `/api/deliveries/${DELIVERY_ID}/reassign`,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.json().details.deliveryErrorCode,
      "delivery_agent_not_eligible",
    );
  });

  it("maps post-dispatch reassign failures to structured 409 responses", async () => {
    const server = createDeliveryReassignServer({
      allowRoutePermission: true,
      serviceError: new DeliveryReassignmentNotAllowedError({
        currentStatus: "in_transit",
        deliveryId: DELIVERY_ID,
      }),
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: { assignedUserId: AGENT_ID },
      url: `/api/deliveries/${DELIVERY_ID}/reassign`,
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      response.json().details.deliveryErrorCode,
      "delivery_reassignment_not_allowed",
    );
  });
});

function createDeliveryReassignServer(
  input: {
    allowRoutePermission?: boolean;
    events?: string[];
    serviceError?: Error;
  } = {},
) {
  const events = input.events ?? [];
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "manager-user" };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          events.push(
            `middleware:${args.permission}:${args.scope ?? "contextual"}`,
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
      deliveryQueryService: {
        async findById(deliveryId) {
          events.push(`query:${deliveryId}`);
          return deliveryRecord();
        },
        async hasSkuHistory() {
          throw unused();
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
          events.push("status-service:reassign");
          if (input.serviceError) throw input.serviceError;
          return {
            delivery: {
              ...deliveryRecord(),
              assignedAt: new Date("2026-05-03T10:00:00.000Z"),
              assignedBy: USER_ID,
              assignedUserId: AGENT_ID,
            },
            fromStatus: "assigned" as const,
            status: "transitioned" as const,
            toStatus: "assigned" as const,
          };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          events.push(
            `route:${args.permission}:${args.scope ?? "contextual"}:${args.locationId ?? "none"}`,
          );
          if (input.allowRoutePermission) return;
          throw permissionDenied();
        },
      },
      onlineOrderSourcePort: {
        async findByOrderReference() {
          throw unused();
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

function deliveryRecord(): DeliveryRecord {
  return {
    assignedAt: new Date("2026-05-01T10:00:00.000Z"),
    assignedBy: USER_ID,
    assignedUserId: "77777777-7777-4777-8777-777777777777",
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    createdBy: USER_ID,
    deliveryId: DELIVERY_ID,
    destination: {
      kind: "location",
      locationId: "33333333-3333-4333-8333-333333333333",
    },
    dispatchedAt: null,
    dispatchedBy: null,
    items: [
      {
        deliveryItemId: "99999999-9999-4999-8999-999999999999",
        itemReference: "DEL-20260501-1",
        quantity: 1,
        skuId: "44444444-4444-4444-8444-444444444444",
      },
    ],
    originLocationId: ORIGIN_LOCATION_ID,
    sourceReference: "TRF-2026-000001",
    sourceType: "transfer",
    status: "assigned",
  };
}

function permissionDenied() {
  return new AppError({
    code: "forbidden",
    detail: "Location-scoped delivery permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}

function unused() {
  return new Error("Not used by this test.");
}
