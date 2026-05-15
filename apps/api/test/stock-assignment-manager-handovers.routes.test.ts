import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { ManagerHandoverRow } from "../src/modules/assignments/postgres-manager-handover-query.repository.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-14T12:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const FOREIGN_LOCATION_ID = "99999999-9999-4999-8999-999999999999";
const SKU_ID = "33333333-3333-4333-8333-333333333333";
const CHAIN_ID = "44444444-4444-4444-8444-444444444444";
const ORIGINAL_WORKER_ID = "77777777-7777-4777-8777-777777777777";

describe("manager handover oversight routes", () => {
  it("lists handovers for a manager-visible location", async () => {
    const routePermissionCalls: string[] = [];
    const server = createManagerAssignmentServer({
      handovers: [handoverRow({}), handoverRow({ lane: "reverted" })],
      routePermissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "GET",
      query: { locationId: LOCATION_ID },
      url: "/api/manager/handovers",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].handoverChainId, CHAIN_ID);
    assert.equal(response.json().items[0].lane, "active");
    assert.deepEqual(response.json().laneCounts, {
      active: 1,
      history: 0,
      reverted: 1,
    });
    assert.deepEqual(routePermissionCalls, [
      "stock.assignments.view:22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("rejects revert when the chain is outside the manager location scope", async () => {
    let endHandoverCalls = 0;
    const routePermissionCalls: string[] = [];
    const server = createManagerAssignmentServer({
      endHandover: async () => {
        endHandoverCalls += 1;
        throw new Error("endHandover should not run");
      },
      handoverForChain: handoverRow({ locationId: FOREIGN_LOCATION_ID }),
      routePermissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { handoverChainId: CHAIN_ID },
      url: "/api/manager/handovers/revert",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(endHandoverCalls, 0);
    assert.deepEqual(routePermissionCalls, [
      "stock.assignments.manage:99999999-9999-4999-8999-999999999999",
    ]);
  });

  it("rejects revert when the handover is no longer active", async () => {
    let endHandoverCalls = 0;
    const server = createManagerAssignmentServer({
      endHandover: async () => {
        endHandoverCalls += 1;
        throw new Error("endHandover should not run");
      },
      handoverForChain: handoverRow({
        canRevert: false,
        latestEventType: "reverted",
        lane: "reverted",
      }),
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { handoverChainId: CHAIN_ID },
      url: "/api/manager/handovers/revert",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, "conflict");
    assert.equal(endHandoverCalls, 0);
  });

  it("reverts an active handover back to the original worker", async () => {
    let originalWorkerId = "";
    const server = createManagerAssignmentServer({
      endHandover: async (input) => {
        originalWorkerId = input.originalWorkerId;
        return revertResult();
      },
      handoverForChain: handoverRow({}),
    });

    const response = await server.inject({
      headers: { authorization: bearerToken() },
      method: "POST",
      payload: { handoverChainId: CHAIN_ID },
      url: "/api/manager/handovers/revert",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "created");
    assert.equal(originalWorkerId, ORIGINAL_WORKER_ID);
  });
});

function createManagerAssignmentServer(input: {
  endHandover?: (args: {
    originalWorkerId: string;
  }) => Promise<ReturnType<typeof revertResult>>;
  handoverForChain?: ManagerHandoverRow | null;
  handovers?: ManagerHandoverRow[];
  routePermissionCalls?: string[];
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "manager-a" };
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
          return [];
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
          return null;
        },
      },
      handoverQueryRepository: {
        async getWorkerHandoverChain() {
          return null;
        },
        async listWorkerHandovers() {
          return [];
        },
      },
      managerHandoverQueryRepository: {
        async getManagerHandoverChain() {
          return input.handoverForChain ?? null;
        },
        async listLocationHandovers() {
          return input.handovers ?? [];
        },
      },
      assignmentCommandService: {
        async assignProduct() {
          throw new Error("not used");
        },
        async endHandover(args) {
          return input.endHandover?.(args) ?? revertResult();
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

function handoverRow(
  overrides: Partial<ManagerHandoverRow>,
): ManagerHandoverRow {
  return {
    canRevert: true,
    currentWorkerName: "Receiver Worker",
    currentWorkerSlug: "receiver-worker",
    fromWorkerId: ORIGINAL_WORKER_ID,
    fromWorkerName: "Source Worker",
    fromWorkerSlug: "source-worker",
    handoverChainId: CHAIN_ID,
    lane: "active",
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
    toWorkerName: "Receiver Worker",
    toWorkerSlug: "receiver-worker",
    updatedAt: NOW,
    variantName: "Medium",
    variantSlug: "medium",
    ...overrides,
  };
}

function revertResult() {
  return {
    event: {
      createdAt: NOW,
      effectiveFrom: NOW,
      eventType: "reverted" as const,
      handoverChainId: CHAIN_ID,
      id: "88888888-8888-4888-8888-888888888888",
      locationId: LOCATION_ID,
      quantity: 3,
      skuId: SKU_ID,
      workerId: ORIGINAL_WORKER_ID,
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
      userSlug: "manager-a",
    }).token
  }`;
}
