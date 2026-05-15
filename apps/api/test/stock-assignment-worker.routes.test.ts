import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { LocationStaffRow } from "../src/modules/assignments/postgres-location-staff-query.js";
import type { WorkerHandoverRow } from "../src/modules/assignments/postgres-worker-handover-query.repository.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-14T12:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const SKU_ID = "33333333-3333-4333-8333-333333333333";
const CHAIN_ID = "44444444-4444-4444-8444-444444444444";

describe("worker stock assignment handover routes", () => {
  it("lists worker handovers for an authorized location", async () => {
    const routePermissionCalls: string[] = [];
    const server = createWorkerAssignmentServer({
      routePermissionCalls,
      handovers: [handoverRow({})],
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/worker/handovers",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].handoverChainId, CHAIN_ID);
    assert.equal(response.json().items[0].lane, "active_received");
    assert.equal(response.json().laneCounts.active_received, 1);
    assert.deepEqual(routePermissionCalls, [
      "stock.handovers.manage:22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("returns eligible active worker recipients without exposing managers", async () => {
    const server = createWorkerAssignmentServer({
      staffRows: [
        staffRow({
          firstName: "Self",
          lastName: "Worker",
          userId: USER_ID,
        }),
        staffRow({ firstName: "Ama", lastName: "Receiver" }),
        staffRow({
          firstName: "Mina",
          lastName: "Manager",
          roleSlug: "manager",
          userId: "55555555-5555-4555-8555-555555555555",
        }),
        staffRow({
          firstName: "Kojo",
          lastName: "Suspended",
          status: "suspended",
          userId: "66666666-6666-4666-8666-666666666666",
        }),
      ],
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/worker/handovers/recipients",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response
        .json()
        .items.map((item: { firstName: string }) => item.firstName),
      ["Ama"],
    );
  });

  it("rejects worker handover revert when the actor is not accountable", async () => {
    let endHandoverCalls = 0;
    const server = createWorkerAssignmentServer({
      endHandover: async () => {
        endHandoverCalls += 1;
        throw new Error("endHandover should not run");
      },
      handoverForChain: handoverRow({ canRevert: false }),
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { handoverChainId: CHAIN_ID },
      url: "/api/worker/handovers/revert",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(endHandoverCalls, 0);
  });
});

function createWorkerAssignmentServer(input: {
  endHandover?: () => Promise<never>;
  handoverForChain?: WorkerHandoverRow | null;
  handovers?: WorkerHandoverRow[];
  routePermissionCalls?: string[];
  staffRows?: LocationStaffRow[];
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "worker-a" };
        },
      },
      permissionService: {
        async assertHasPermission() {
          return;
        },
      },
    },
    stockAssignments: {
      assignmentQueryRepository: {
        async getLocationAssignments() {
          return [];
        },
        async getLocationStaff() {
          return input.staffRows ?? [];
        },
        async getWorkerAssignments() {
          return [];
        },
      },
      assignmentHistoryQueryRepository: {
        async getAssignmentHistory() {
          return null;
        },
        async getWorkerAssignmentHistory() {
          return null;
        },
      },
      handoverRepository: {
        async getOriginalWorkerForChain() {
          return USER_ID;
        },
      },
      handoverQueryRepository: {
        async getWorkerHandoverChain() {
          return input.handoverForChain ?? null;
        },
        async listWorkerHandovers() {
          return input.handovers ?? [];
        },
      },
      managerHandoverQueryRepository: {
        async getManagerHandoverChain() {
          return null;
        },
        async listLocationHandovers() {
          return [];
        },
      },
      assignmentCommandService: {
        async assignProduct() {
          throw new Error("not used");
        },
        async endHandover() {
          return input.endHandover?.() ?? revertResult();
        },
        async initiateHandover() {
          throw new Error("not used");
        },
        async reassignProduct() {
          throw new Error("not used");
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          if (args.locationId) {
            input.routePermissionCalls?.push(
              `${args.permission}:${args.locationId}`,
            );
          }
          if (args.locationId !== LOCATION_ID) {
            throw new AppError({
              code: "forbidden",
              detail: "Location-scoped permission denied.",
              statusCode: 403,
              title: "Forbidden",
            });
          }
        },
      },
      stockBalanceRepository: {
        async getOnHandQuantity() {
          return 100;
        },
      },
    },
  });
}

function handoverRow(overrides: Partial<WorkerHandoverRow>): WorkerHandoverRow {
  return {
    canRevert: true,
    currentWorkerName: "Worker A",
    currentWorkerSlug: "worker-a",
    fromWorkerId: "77777777-7777-4777-8777-777777777777",
    fromWorkerName: "Source Worker",
    fromWorkerSlug: "source-worker",
    handoverChainId: CHAIN_ID,
    lane: "active_received",
    latestEventType: "handover_in",
    locationId: LOCATION_ID,
    locationName: "East Legon",
    primaryImageUrl: null,
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    quantity: 3,
    sku: "UNI-SHIRT-M",
    skuId: SKU_ID,
    startedAt: NOW,
    toWorkerName: "Worker A",
    toWorkerSlug: "worker-a",
    updatedAt: NOW,
    variantName: "Medium",
    variantSlug: "medium",
    ...overrides,
  };
}

function staffRow(overrides: Partial<ReturnType<typeof baseStaffRow>>) {
  return { ...baseStaffRow(), ...overrides };
}

function baseStaffRow(): LocationStaffRow {
  return {
    activeAssignmentCount: 1,
    assignedAt: NOW,
    email: "ama@example.com",
    firstName: "Ama",
    lastName: "Receiver",
    lastSaleAt: null,
    locationName: "East Legon",
    netSalesAmount: "0.00",
    primaryImageUrl: null,
    returnsCount: 0,
    returnsTotalAmount: "0.00",
    roleName: "Worker",
    roleSlug: "worker" as const,
    salesCount: 0,
    salesTotalAmount: "0.00",
    status: "active" as const,
    userId: "88888888-8888-4888-8888-888888888888",
    userSlug: "ama-receiver",
  };
}

function revertResult() {
  return {
    event: {
      createdAt: NOW,
      effectiveFrom: NOW,
      eventType: "reverted" as const,
      handoverChainId: CHAIN_ID,
      id: "99999999-9999-4999-8999-999999999999",
      locationId: LOCATION_ID,
      quantity: 3,
      skuId: SKU_ID,
      workerId: USER_ID,
    },
    status: "created" as const,
  };
}

function bearerToken() {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug: "worker-a",
    }).token
  }`;
}
