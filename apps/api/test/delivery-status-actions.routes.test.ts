import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryStatus } from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import type {
  DeliveryStatusService,
  DeliveryTransitionResult,
} from "../src/modules/deliveries/delivery-status.contracts.js";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DELIVERY_ID = "66666666-6666-4666-8666-666666666666";
const DELIVERY_REFERENCE = "DLV-00001";
const ORIGIN_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const ORIGIN_LOCATION_SLUG = "main-store";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

const ACTIONS = [
  {
    method: "dispatch",
    permission: "deliveries.dispatch",
    payload: {},
    toStatus: "in_transit",
    url: `/api/deliveries/${DELIVERY_REFERENCE}/dispatch`,
  },
  {
    method: "complete",
    permission: "deliveries.complete",
    payload: {},
    toStatus: "completed",
    url: `/api/deliveries/${DELIVERY_REFERENCE}/complete`,
  },
  {
    method: "cancel",
    permission: "deliveries.cancel",
    payload: { reason: "Customer requested cancellation" },
    toStatus: "cancelled",
    url: `/api/deliveries/${DELIVERY_REFERENCE}/cancel`,
  },
] as const;

describe("delivery status action routes", () => {
  it("rejects invalid delivery references before route-level service lookup", async () => {
    const events: string[] = [];
    const server = createDeliveryStatusActionServer({ events });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {},
      url: "/api/deliveries/not-a-delivery-id/dispatch",
    });

    assertValidationProblem(response);
    assert.match(response.json().detail, /deliveryReference/);
    assert.deepEqual(events, ["middleware:deliveries.dispatch:any_active"]);
  });

  for (const action of ACTIONS) {
    it(`rejects foreign-origin ${action.method} before service invocation`, async () => {
      const events: string[] = [];
      const server = createDeliveryStatusActionServer({ events });

      const response = await server.inject({
        headers: AUTH_HEADERS,
        method: "POST",
        payload: action.payload,
        url: action.url,
      });

      assert.equal(response.statusCode, 403);
      assert.deepEqual(events, [
        `middleware:${action.permission}:any_active`,
        `query:${DELIVERY_REFERENCE}`,
        `route:${action.permission}:contextual:${ORIGIN_LOCATION_ID}`,
      ]);
    });

    it(`invokes ${action.method} after delivery-origin permission passes`, async () => {
      const events: string[] = [];
      const server = createDeliveryStatusActionServer({
        allowRoutePermission: true,
        events,
      });

      const response = await server.inject({
        headers: AUTH_HEADERS,
        method: "POST",
        payload: action.payload,
        url: action.url,
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json().status, "transitioned");
      assert.equal(response.json().toStatus, action.toStatus);
      assert.deepEqual(events, [
        `middleware:${action.permission}:any_active`,
        `query:${DELIVERY_REFERENCE}`,
        `route:${action.permission}:contextual:${ORIGIN_LOCATION_ID}`,
        `status-service:${action.method}:${servicePayload(action)}`,
      ]);
    });
  }
});

function assertValidationProblem(response: {
  json(): {
    code: string;
    detail: string;
    requestId: string;
    status: number;
    title: string;
  };
  statusCode: number;
}) {
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().status, 400);
  assert.equal(response.json().code, "validation_error");
  assert.equal(response.json().title, "Validation Error");
  assert.equal(typeof response.json().requestId, "string");
}

function createDeliveryStatusActionServer(input: {
  allowRoutePermission?: boolean;
  events: string[];
}) {
  const service = statusService(input.events);
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
      deliveryPublicIdentifierResolver: {
        async findLocationIdBySlug() {
          throw unused();
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
        async listByAgent() {
          throw unused();
        },
        async listByLocation() {
          throw unused();
        },
      },
      deliveryStatusService: service,
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
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

function statusService(events: string[]): DeliveryStatusService {
  return {
    async assign() {
      throw unused();
    },
    async cancel(input) {
      events.push(`status-service:cancel:${input.deliveryId}:${input.reason}`);
      return transition("cancelled");
    },
    async complete(input) {
      events.push(`status-service:complete:${input.deliveryId}`);
      return transition("completed");
    },
    async dispatch(input) {
      events.push(`status-service:dispatch:${input.deliveryId}`);
      return transition("in_transit");
    },
    async reassign() {
      throw unused();
    },
  };
}

function transition(toStatus: DeliveryStatus): DeliveryTransitionResult {
  return {
    delivery: { ...deliveryRecord(), status: toStatus },
    fromStatus: "assigned",
    status: "transitioned",
    toStatus,
  };
}

function servicePayload(action: (typeof ACTIONS)[number]): string {
  return action.method === "cancel"
    ? `${DELIVERY_ID}:${action.payload.reason}`
    : DELIVERY_ID;
}

function deliveryRecord(): DeliveryRecord {
  return {
    assignedAt: new Date("2026-05-01T10:00:00.000Z"),
    assignedBy: USER_ID,
    assignedUserId: "77777777-7777-4777-8777-777777777777",
    assignedUserSlug: "delivery-agent",
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    createdBy: USER_ID,
    createdBySlug: "manager-user",
    deliveryId: DELIVERY_ID,
    deliveryReference: DELIVERY_REFERENCE,
    destination: {
      kind: "location",
      locationId: "33333333-3333-4333-8333-333333333333",
      locationSlug: "warehouse",
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
    originLocationId: ORIGIN_LOCATION_ID,
    originLocationSlug: ORIGIN_LOCATION_SLUG,
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
