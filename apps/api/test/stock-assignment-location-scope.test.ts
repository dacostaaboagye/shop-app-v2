import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const TOKEN = () =>
  issueAccessToken({
    expiresInSeconds: 900,
    now: new Date("2026-04-17T12:00:00.000Z"),
    secret: "development-access-secret",
    userId: "usr_123",
    userSlug: "store-manager",
  }).token;

function authHeader() {
  return { authorization: `Bearer ${TOKEN()}` };
}

const FOREIGN_LOCATION_ID = "f0000000-0000-4000-8000-000000000000";

/**
 * any_active routes pass an explicit assertHasPermission check before
 * acting on a client-supplied locationId. The middleware-level any_active
 * check returns the union across the user's active scopes; without this
 * follow-up call a manager of location A could pass body.locationId=B
 * and act on B.
 */
describe("stock-assignment any_active routes pin to the supplied locationId", () => {
  it("rejects manager assign when permission resolution fails for the body locationId", async () => {
    const probedLocationIds: string[] = [];
    let middlewareCalled = false;

    const server = createServer({
      accessControl: {
        accessTokenAuthenticationService: {
          async authenticate() {
            return { userId: "usr_123", userSlug: "store-manager" };
          },
        },
        permissionService: {
          async assertHasPermission(input) {
            // The middleware (any_active) accepts the request; the route
            // handler's contextual follow-up rejects it.
            if (input.scope === "any_active") {
              middlewareCalled = true;
              return;
            }
            if (input.locationId) {
              probedLocationIds.push(input.locationId);
            }
            throw new AppError({
              code: "forbidden",
              detail: "Location-scoped permission denied.",
              statusCode: 403,
              title: "Forbidden",
            });
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
            return null;
          },
          async listLocationHandovers() {
            return [];
          },
        },
        assignmentCommandService: {
          async assignProduct() {
            throw new Error(
              "assignProduct must not run when location check rejects",
            );
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
          async assertHasPermission(input) {
            if (input.locationId) {
              probedLocationIds.push(input.locationId);
            }
            throw new AppError({
              code: "forbidden",
              detail: "Location-scoped permission denied.",
              statusCode: 403,
              title: "Forbidden",
            });
          },
        },
        stockBalanceRepository: {
          async getOnHandQuantity() {
            return 100;
          },
        },
      },
    });

    const response = await server.inject({
      headers: authHeader(),
      method: "POST",
      url: "/api/manager/assignments",
      payload: {
        locationId: FOREIGN_LOCATION_ID,
        quantity: 1,
        skuId: "11111111-1111-4111-8111-111111111111",
        workerId: "22222222-2222-4222-8222-222222222222",
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(middlewareCalled, true);
    assert.deepEqual(probedLocationIds, [FOREIGN_LOCATION_ID]);
  });
});
