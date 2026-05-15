import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { AssignmentHistoryRow } from "../src/modules/assignments/postgres-assignment-history-query.repository.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-14T12:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const SKU_ID = "33333333-3333-4333-8333-333333333333";

describe("stock assignment history routes", () => {
  it("returns manager-visible assignment history for a scoped location", async () => {
    const routePermissionCalls: string[] = [];
    const server = createAssignmentHistoryServer({
      history: historyRow(),
      routePermissionCalls,
    });

    const response = await server.inject({
      headers: { authorization: bearerToken("manager-a") },
      method: "GET",
      query: { locationId: LOCATION_ID, skuId: SKU_ID },
      url: "/api/manager/assignments/history",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].eventType, "assigned");
    assert.equal(response.json().items[1].eventType, "handover_in");
    assert.deepEqual(routePermissionCalls, [
      "stock.assignments.view:22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("returns worker assignment history only for the current accountable worker", async () => {
    let workerHistoryInput: Record<string, string> | null = null;
    const server = createAssignmentHistoryServer({
      history: historyRow(),
      async getWorkerAssignmentHistory(input) {
        workerHistoryInput = input;
        return historyRow();
      },
    });

    const response = await server.inject({
      headers: { authorization: bearerToken("worker-a") },
      method: "GET",
      query: { locationId: LOCATION_ID, skuId: SKU_ID },
      url: "/api/worker/assignments/history",
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(workerHistoryInput, {
      locationId: LOCATION_ID,
      skuId: SKU_ID,
      workerId: USER_ID,
    });
  });

  it("returns 404 when worker history is not currently accountable", async () => {
    const server = createAssignmentHistoryServer({ history: null });

    const response = await server.inject({
      headers: { authorization: bearerToken("worker-a") },
      method: "GET",
      query: { locationId: LOCATION_ID, skuId: SKU_ID },
      url: "/api/worker/assignments/history",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "not_found");
  });
});

function createAssignmentHistoryServer(input: {
  getWorkerAssignmentHistory?: (args: {
    locationId: string;
    skuId: string;
    workerId: string;
  }) => Promise<AssignmentHistoryRow | null>;
  history: AssignmentHistoryRow | null;
  routePermissionCalls?: string[];
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "actor-a" };
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
          return input.history;
        },
        async getWorkerAssignmentHistory(args) {
          return input.getWorkerAssignmentHistory?.(args) ?? input.history;
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
          throw new Error("not used");
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

function historyRow(): AssignmentHistoryRow {
  return {
    items: [
      {
        actorName: "Mina Manager",
        actorSlug: "mina-manager",
        createdAt: NOW,
        effectiveFrom: NOW,
        eventType: "assigned",
        handoverChainId: null,
        quantity: 3,
        workerName: "Worker A",
        workerSlug: "worker-a",
      },
      {
        actorName: "Worker A",
        actorSlug: "worker-a",
        createdAt: NOW,
        effectiveFrom: NOW,
        eventType: "handover_in",
        handoverChainId: "44444444-4444-4444-8444-444444444444",
        quantity: 3,
        workerName: "Worker B",
        workerSlug: "worker-b",
      },
    ],
    locationId: LOCATION_ID,
    locationName: "East Legon",
    locationSlug: "east-legon",
    productName: "Uniform Shirt",
    productSlug: "uniform-shirt",
    sku: "UNI-SHIRT-M",
    skuId: SKU_ID,
    variantName: "Medium",
    variantSlug: "medium",
  };
}

function bearerToken(userSlug: string) {
  return `Bearer ${
    issueAccessToken({
      expiresInSeconds: 900,
      now: NOW,
      secret: "development-access-secret",
      userId: USER_ID,
      userSlug,
    }).token
  }`;
}
