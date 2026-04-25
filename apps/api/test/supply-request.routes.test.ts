import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "../src/modules/stock/postgres-supply-request.repository.js";
import { createStockSupplyEvent } from "../src/modules/stock/stock-supply-event-publisher.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-19T19:30:00.000Z");
const UUIDS = {
  actor: "11111111-1111-4111-8111-111111111111",
  admin: "11111111-1111-4111-8111-111111111112",
  destinationA: "22222222-2222-4222-8222-222222222221",
  destinationB: "22222222-2222-4222-8222-222222222222",
  gtn: "33333333-3333-4333-8333-333333333333",
  managerSourceA: "44444444-4444-4444-8444-444444444441",
  managerSourceB: "44444444-4444-4444-8444-444444444442",
  otherWorker: "55555555-5555-4555-8555-555555555555",
  request: "66666666-6666-4666-8666-666666666666",
  sku: "77777777-7777-4777-8777-777777777777",
};

describe("stock supply routes", () => {
  it("rejects worker request creation outside the actor's destination scope", async () => {
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "worker-a"),
      },
      method: "POST",
      payload: {
        locationId: UUIDS.destinationB,
        requestedQuantity: 3,
        skuId: UUIDS.sku,
        sourceLocationId: UUIDS.managerSourceA,
      },
      url: "/api/worker/stock/supply-requests",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
  });

  it("rejects manager inbox access outside the actor's source scope", async () => {
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.manage": [UUIDS.managerSourceA],
      },
      userSlug: "manager-a",
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "manager-a"),
      },
      method: "GET",
      query: {
        page: "1",
        pageSize: "25",
        sourceLocationId: UUIDS.managerSourceB,
      },
      url: "/api/manager/stock/supply-requests/incoming",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
  });

  it("lists manager inbox requests across all manageable source locations", async () => {
    let listedSourceLocationIds: string[] = [];
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.manage": [UUIDS.managerSourceA, UUIDS.managerSourceB],
      },
      async listBySourceLocations(input) {
        listedSourceLocationIds = input.sourceLocationIds;
        return { items: [makeSupplyRequestRow()], total: 1 };
      },
      userSlug: "manager-a",
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "manager-a"),
      },
      method: "GET",
      query: {
        page: "1",
        pageSize: "25",
      },
      url: "/api/manager/stock/supply-requests/incoming",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(listedSourceLocationIds, [
      UUIDS.managerSourceA,
      UUIDS.managerSourceB,
    ]);
    assert.equal(response.json().total, 1);
  });

  it("lists all requests involving a managed location", async () => {
    let listedLocationId = "";
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.manage": [UUIDS.destinationA],
      },
      async listByLocation(input) {
        listedLocationId = input.locationId;
        return { items: [makeSupplyRequestRow()], total: 1 };
      },
      userSlug: "manager-a",
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "manager-a"),
      },
      method: "GET",
      query: {
        locationId: UUIDS.destinationA,
        page: "1",
        pageSize: "25",
      },
      url: "/api/manager/stock/supply-requests",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(listedLocationId, UUIDS.destinationA);
    assert.equal(response.json().total, 1);
  });

  it("lists eligible source locations for an in-scope worker destination", async () => {
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "worker-a"),
      },
      method: "GET",
      query: {
        destinationLocationId: UUIDS.destinationA,
      },
      url: "/api/worker/stock/supply-request-sources",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      items: [
        {
          locationId: UUIDS.managerSourceA,
          locationName: "Warehouse A",
        },
        {
          locationId: UUIDS.managerSourceB,
          locationName: "Warehouse B",
        },
      ],
    });
  });

  it("publishes a transfer.requested event after worker request creation", async () => {
    const publishedEvents: PlatformEventRecord[] = [];
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
      publishedEvents,
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "worker-a"),
      },
      method: "POST",
      payload: {
        locationId: UUIDS.destinationA,
        notes: "Need stock",
        requestedQuantity: 3,
        skuId: UUIDS.sku,
        sourceLocationId: UUIDS.managerSourceA,
      },
      url: "/api/worker/stock/supply-requests",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(publishedEvents.length, 1);
    assert.equal(publishedEvents[0]?.type, "transfer.requested");
    assert.equal(publishedEvents[0]?.resource.reference, "SUP-0001");
    assert.equal(publishedEvents[0]?.payload.status, "pending");
  });

  it("rejects receipt confirmation by a different worker", async () => {
    let confirmCalled = false;
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
      confirmReceiptImpl: async () => {
        confirmCalled = true;
        return {
          gtn: makeGtnRow(),
          supplyRequest: makeSupplyRequestRow({
            receivedAt: NOW,
            requesterId: UUIDS.otherWorker,
            status: "received",
          }),
        };
      },
      requestById: makeSupplyRequestRow({
        locationId: UUIDS.destinationA,
        requesterId: UUIDS.otherWorker,
        status: "dispatched",
      }),
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "worker-a"),
      },
      method: "PATCH",
      payload: { notes: "Received" },
      url: `/api/worker/stock/supply-requests/${UUIDS.request}/confirm-receipt`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(confirmCalled, false);
    assert.equal(response.json().title, "Forbidden");
  });

  it("allows admin to cancel another worker's pending request", async () => {
    let cancelByIdCalled = false;
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
      cancelByIdImpl: async () => {
        cancelByIdCalled = true;
        return makeSupplyRequestRow({
          requesterId: UUIDS.otherWorker,
          status: "cancelled",
        });
      },
      globalPermissions: ["admin.dashboard.view", "stock.supply.request"],
      requestById: makeSupplyRequestRow({
        requesterId: UUIDS.otherWorker,
        status: "pending",
      }),
      userId: UUIDS.admin,
      userSlug: "admin-user",
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.admin, "admin-user"),
      },
      method: "PATCH",
      url: `/api/worker/stock/supply-requests/${UUIDS.request}/cancel`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(cancelByIdCalled, true);
    assert.equal(response.json().status, "cancelled");
  });

  it("allows admin receipt confirmation for another worker's request", async () => {
    let confirmCalled = false;
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
        "stock.supply.manage": [UUIDS.managerSourceA],
      },
      confirmReceiptImpl: async () => {
        confirmCalled = true;
        return {
          gtn: makeGtnRow({
            receivedAt: NOW,
            receivedBy: UUIDS.admin,
            status: "received",
          }),
          supplyRequest: makeSupplyRequestRow({
            receivedAt: NOW,
            requesterId: UUIDS.otherWorker,
            status: "received",
          }),
        };
      },
      globalPermissions: [
        "admin.dashboard.view",
        "stock.supply.manage",
        "stock.supply.request",
      ],
      requestById: makeSupplyRequestRow({
        locationId: UUIDS.destinationA,
        requesterId: UUIDS.otherWorker,
        status: "dispatched",
      }),
      userId: UUIDS.admin,
      userSlug: "admin-user",
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.admin, "admin-user"),
      },
      method: "PATCH",
      payload: { notes: "Admin override receipt" },
      url: `/api/worker/stock/supply-requests/${UUIDS.request}/confirm-receipt`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(confirmCalled, true);
    assert.equal(response.json().status, "received");
  });

  it("rejects GTN access for an uninvolved worker", async () => {
    const server = createStockSupplyServer({
      allowedLocationPermissions: {
        "stock.supply.request": [UUIDS.destinationA],
      },
      gtnById: makeGtnRow({
        destinationLocationId: UUIDS.destinationB,
        sourceLocationId: UUIDS.managerSourceB,
      }),
      requestById: makeSupplyRequestRow({
        locationId: UUIDS.destinationB,
        requesterId: UUIDS.otherWorker,
        sourceLocationId: UUIDS.managerSourceB,
        status: "dispatched",
      }),
    });

    const response = await server.inject({
      headers: {
        authorization: bearerToken(UUIDS.actor, "worker-a"),
      },
      method: "GET",
      url: `/api/stock/gtns/${UUIDS.gtn}`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
  });
});

function createStockSupplyServer(input: {
  allowedLocationPermissions: Record<string, string[]>;
  cancelByIdImpl?: () => Promise<SupplyRequestRow>;
  confirmReceiptImpl?: () => Promise<{
    gtn: GtnRow;
    supplyRequest: SupplyRequestRow;
  }>;
  globalPermissions?: string[];
  gtnById?: GtnRow;
  listByLocation?: (input: {
    locationId: string;
    page: number;
    pageSize: number;
    status?: string;
  }) => Promise<{ items: SupplyRequestRow[]; total: number }>;
  listBySourceLocations?: (input: {
    page: number;
    pageSize: number;
    sourceLocationIds: string[];
    status?: string;
  }) => Promise<{ items: SupplyRequestRow[]; total: number }>;
  publishedEvents?: PlatformEventRecord[];
  requestById?: SupplyRequestRow;
  userId?: string;
  userSlug?: string;
}) {
  const permissionService = createPermissionService({
    allowedLocationPermissions: input.allowedLocationPermissions,
    globalPermissions: input.globalPermissions ?? [],
  });

  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate(token) {
          const { AccessTokenAuthenticationService } = await import(
            "../src/modules/auth/access-token-authentication.service.js"
          );

          return new AccessTokenAuthenticationService(
            {
              async findUserById() {
                return {
                  id: input.userId ?? UUIDS.actor,
                  slug: input.userSlug ?? "worker-a",
                  status: "active" as const,
                };
              },
            },
            "development-access-secret",
            () => NOW,
          ).authenticate(token);
        },
      },
      permissionService,
    },
    stockSupply: {
      locationRepository: {
        async listActiveLocations() {
          return [
            { id: UUIDS.destinationA, name: "Store A" },
            { id: UUIDS.managerSourceA, name: "Warehouse A" },
            { id: UUIDS.managerSourceB, name: "Warehouse B" },
          ];
        },
      },
      permissionService,
      referenceNumberService: {
        async generateReference() {
          return "SUP-0001";
        },
      },
      supplyRequestRepository: {
        async findById() {
          return input.requestById ?? makeSupplyRequestRow();
        },
        async findGtnById() {
          return input.gtnById ?? makeGtnRow();
        },
        async findGtnBySupplyRequest() {
          return input.gtnById ?? makeGtnRow();
        },
        async listByLocation(args) {
          return input.listByLocation
            ? input.listByLocation(args)
            : { items: [], total: 0 };
        },
        async listByRequester() {
          return { items: [], total: 0 };
        },
        async listBySourceLocations(args) {
          return input.listBySourceLocations
            ? input.listBySourceLocations(args)
            : { items: [], total: 0 };
        },
        async listBySourceLocation() {
          return { items: [], total: 0 };
        },
      },
      supplyService: {
        async approve() {
          const supplyRequest = makeSupplyRequestRow({ status: "approved" });
          publishTestEvent(input, "transfer.approved", supplyRequest);
          return supplyRequest;
        },
        async cancel() {
          const supplyRequest = makeSupplyRequestRow({ status: "cancelled" });
          publishTestEvent(input, "transfer.cancelled", supplyRequest);
          return supplyRequest;
        },
        async cancelById() {
          if (input.cancelByIdImpl) {
            return input.cancelByIdImpl();
          }

          const supplyRequest = makeSupplyRequestRow({ status: "cancelled" });
          publishTestEvent(input, "transfer.cancelled", supplyRequest);
          return supplyRequest;
        },
        async confirmReceipt() {
          if (input.confirmReceiptImpl) {
            return input.confirmReceiptImpl();
          }

          return {
            gtn: makeGtnRow(),
            supplyRequest: makeSupplyRequestRow({ status: "received" }),
          };
        },
        async createRequest() {
          const supplyRequest = makeSupplyRequestRow({ status: "pending" });
          publishTestEvent(input, "transfer.requested", supplyRequest);
          return supplyRequest;
        },
        async dispatch() {
          return {
            gtn: makeGtnRow(),
            supplyRequest: makeSupplyRequestRow({ status: "dispatched" }),
          };
        },
        async reject() {
          const supplyRequest = makeSupplyRequestRow({ status: "rejected" });
          publishTestEvent(input, "transfer.rejected", supplyRequest);
          return supplyRequest;
        },
      },
      variantSnapshotRepository: {
        async getVariantSnapshot() {
          return {
            productName: "Travel Pack",
            sku: "TRAVEL-PACK-001",
            variantName: "Standard",
          };
        },
      },
    },
  });
}

function publishTestEvent(
  input: { publishedEvents?: PlatformEventRecord[]; userSlug?: string },
  type: string,
  supplyRequest: SupplyRequestRow,
) {
  input.publishedEvents?.push(
    createStockSupplyEvent({
      actor: {
        userId: UUIDS.actor,
        userSlug: input.userSlug ?? "worker-a",
      },
      supplyRequest,
      summary: `${supplyRequest.reference} changed.`,
      type,
    }),
  );
}

function createPermissionService(input: {
  allowedLocationPermissions: Record<string, string[]>;
  globalPermissions: string[];
}) {
  return {
    async assertHasPermission(inputArgs: {
      locationId?: string;
      permission: string;
      scope?: "any_active" | "contextual";
      user: { userId: string; userSlug: string };
    }) {
      if (input.globalPermissions.includes(inputArgs.permission)) {
        return;
      }

      const scopedLocations =
        input.allowedLocationPermissions[inputArgs.permission] ?? [];

      if (!inputArgs.locationId) {
        if (scopedLocations.length > 0) {
          return;
        }
      } else if (scopedLocations.includes(inputArgs.locationId)) {
        return;
      }

      throw new AppError({
        code: "forbidden",
        detail: "You do not have permission to access this route.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
    async resolvePermissionsForAnyScope() {
      return input.globalPermissions.map((key) => ({
        key,
        source: "role" as const,
      }));
    },
    async resolveAllPermissions() {
      return {
        anyActivePermissions: input.globalPermissions.map((key) => ({
          key,
          source: "role" as const,
        })),
        locationScopes: Object.entries(input.allowedLocationPermissions).reduce<
          Array<{
            locationId: string;
            locationName: string;
            locationSlug: string;
            permissions: Array<{ key: string; source: "role" }>;
          }>
        >((scopes, [permission, locationIds]) => {
          for (const locationId of locationIds) {
            const existingScope = scopes.find(
              (scope) => scope.locationId === locationId,
            );
            if (existingScope) {
              existingScope.permissions.push({
                key: permission,
                source: "role",
              });
              continue;
            }

            scopes.push({
              locationId,
              locationName: locationNameFor(locationId),
              locationSlug: locationSlugFor(locationId),
              permissions: [{ key: permission, source: "role" }],
            });
          }

          return scopes;
        }, []),
      };
    },
  };
}

function locationNameFor(locationId: string) {
  switch (locationId) {
    case UUIDS.destinationA:
      return "Store A";
    case UUIDS.destinationB:
      return "Store B";
    case UUIDS.managerSourceA:
      return "Warehouse A";
    case UUIDS.managerSourceB:
      return "Warehouse B";
    default:
      return "Location";
  }
}

function locationSlugFor(locationId: string) {
  switch (locationId) {
    case UUIDS.destinationA:
      return "store-a";
    case UUIDS.destinationB:
      return "store-b";
    case UUIDS.managerSourceA:
      return "warehouse-a";
    case UUIDS.managerSourceB:
      return "warehouse-b";
    default:
      return "location";
  }
}

function makeSupplyRequestRow(
  overrides: Partial<SupplyRequestRow> = {},
): SupplyRequestRow {
  return {
    ...makeSupplyRequestRowBase(),
    ...overrides,
  };
}

function makeSupplyRequestRowBase(): SupplyRequestRow {
  return {
    approvedQuantity: 2,
    createdAt: NOW,
    dispatchedAt: NOW,
    dispatchedBy: UUIDS.actor,
    gtnReference: "GTN-0001",
    id: UUIDS.request,
    locationId: UUIDS.destinationA,
    locationName: "Store A",
    notes: null,
    receivedAt: null,
    reference: "SUP-0001",
    sourceReservationStatus: null,
    transferReference: "TRF-0001",
    requesterEmail: "worker@example.com",
    requesterId: UUIDS.actor,
    requesterName: "Worker A",
    requestedQuantity: 2,
    resolutionNotes: null,
    resolvedAt: null,
    resolvedBy: null,
    skuId: UUIDS.sku,
    skuSnapshot: {
      productName: "Travel Pack",
      sku: "TRAVEL-PACK-001",
      variantName: "Standard",
    },
    sourceLocationId: UUIDS.managerSourceA,
    sourceLocationName: "Warehouse A",
    status: "pending",
  };
}

function makeGtnRow(overrides: Partial<GtnRow> = {}): GtnRow {
  return {
    ...makeGtnRowBase(),
    ...overrides,
  };
}

function makeGtnRowBase(): GtnRow {
  return {
    createdAt: NOW,
    destinationLocationId: UUIDS.destinationA,
    destinationLocationName: "Store A",
    dispatchedAt: NOW,
    dispatchedBy: UUIDS.actor,
    dispatchedByName: "Manager A",
    id: UUIDS.gtn,
    notes: null,
    quantity: 2,
    receivedAt: null,
    receivedBy: null,
    receivedByName: null,
    reference: "GTN-0001",
    skuId: UUIDS.sku,
    skuSnapshot: {
      productName: "Travel Pack",
      sku: "TRAVEL-PACK-001",
      variantName: "Standard",
    },
    sourceLocationId: UUIDS.managerSourceA,
    sourceLocationName: "Warehouse A",
    status: "dispatched",
    supplyRequestId: UUIDS.request,
    supplyRequestReference: "SUP-0001",
  };
}

function bearerToken(userId: string, userSlug: string) {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId,
      userSlug,
    }).token
  }`;
}
