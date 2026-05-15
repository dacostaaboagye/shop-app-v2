import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DeliveryRecord } from "../src/modules/deliveries/delivery.types.js";
import type { DeliveryQueryService } from "../src/modules/deliveries/delivery-query.contracts.js";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DELIVERY_ID = "66666666-6666-4666-8666-666666666666";
const DELIVERY_REFERENCE = "DLV-00001";
const HIGH_REF = "DLV-100000";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const LOCATION_SLUG = "main-store";
const AGENT_USER_ID = USER_ID;
const AGENT_USER_SLUG = "manager-user";
const FOREIGN_AGENT_USER_SLUG = "foreign-agent";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

describe("delivery query routes", () => {
  it("requires exactly one locationSlug or agentUserSlug for list queries", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls });

    const missingScope = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: "/api/deliveries",
    });
    const competingScopes = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?locationSlug=${LOCATION_SLUG}&agentUserSlug=${AGENT_USER_SLUG}`,
    });

    assertValidationProblem(missingScope);
    assert.match(
      missingScope.json().detail,
      /Provide exactly one of locationSlug or agentUserSlug/,
    );
    assertValidationProblem(competingScopes);
    assert.match(
      competingScopes.json().detail,
      /Provide exactly one of locationSlug or agentUserSlug/,
    );
    assert.deepEqual(calls, []);
  });

  it("rejects invalid list query limits with problem details", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?locationSlug=${LOCATION_SLUG}&limit=201`,
    });

    assertValidationProblem(response);
    assert.match(response.json().detail, /limit/);
    assert.deepEqual(calls, []);
  });

  it("forwards location status filters and limit to the query service", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({
      calls,
      records: [deliveryRecord({ status: "assigned" })],
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url:
        `/api/deliveries?locationSlug=${LOCATION_SLUG}` +
        "&status=assigned&status=in_transit&limit=25",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json().items[0]?.deliveryReference,
      DELIVERY_REFERENCE,
    );
    assert.deepEqual(calls, [
      {
        input: {
          filters: { limit: 25, status: ["assigned", "in_transit"] },
          locationId: LOCATION_ID,
        },
        method: "listByLocation",
      },
    ]);
  });

  it("forwards agent status filters and limit to the query service", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url:
        `/api/deliveries?agentUserSlug=${AGENT_USER_SLUG}` +
        "&status=assigned&limit=10",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls, [
      {
        input: {
          agentUserId: AGENT_USER_ID,
          filters: { limit: 10, status: ["assigned"] },
        },
        method: "listByAgent",
      },
    ]);
  });

  it("rejects foreign agent list probes before service invocation", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?agentUserSlug=${FOREIGN_AGENT_USER_SLUG}`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "forbidden");
    assert.deepEqual(calls, []);
  });

  it("returns safe problem details when a delivery is not found", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls, findResult: null });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries/${HIGH_REF}`,
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "not_found");
    assert.equal(response.json().title, "Delivery not found");
    assert.match(response.json().detail, /No delivery found/);
    assert.deepEqual(calls, [
      { deliveryReference: HIGH_REF, method: "findByReference" },
    ]);
  });

  it("rejects invalid delivery references before query service invocation", async () => {
    const calls: QueryCall[] = [];
    const server = createDeliveryQueryServer({ calls });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: "/api/deliveries/not-a-delivery-id",
    });

    assertValidationProblem(response);
    assert.match(response.json().detail, /deliveryReference/);
    assert.deepEqual(calls, []);
  });
});

type QueryCall =
  | {
      deliveryReference: string;
      method: "findByReference";
    }
  | {
      input: Parameters<DeliveryQueryService["listByAgent"]>[0];
      method: "listByAgent";
    }
  | {
      input: Parameters<DeliveryQueryService["listByLocation"]>[0];
      method: "listByLocation";
    };

function createDeliveryQueryServer(
  input: {
    calls?: QueryCall[];
    findResult?: DeliveryRecord | null;
    records?: DeliveryRecord[];
  } = {},
) {
  const calls = input.calls ?? [];
  const records = input.records ?? [];
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: AGENT_USER_SLUG };
        },
      },
      permissionService: {
        async assertHasPermission() {},
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
          calls.push({
            deliveryReference: deliveryId,
            method: "findByReference",
          });
          return input.findResult === undefined
            ? deliveryRecord()
            : input.findResult;
        },
        async findByReference(deliveryReference) {
          calls.push({ deliveryReference, method: "findByReference" });
          return input.findResult === undefined
            ? deliveryRecord()
            : input.findResult;
        },
        async hasSkuHistory() {
          throw unused();
        },
        async listByAgent(queryInput) {
          calls.push({ input: queryInput, method: "listByAgent" });
          return records;
        },
        async listByLocation(queryInput) {
          calls.push({ input: queryInput, method: "listByLocation" });
          return records;
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
        async assertHasPermission() {},
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
    originLocationId: LOCATION_ID,
    originLocationSlug: LOCATION_SLUG,
    sourceReference: "TRF-2026-000001",
    sourceType: "transfer",
    status: "assigned",
    ...overrides,
  };
}

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

function unused() {
  return new Error("Not used by this test.");
}
