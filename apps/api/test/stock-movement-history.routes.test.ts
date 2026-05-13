import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockMovementSummary } from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-13T12:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("stock movement history routes", () => {
  it("lists admin movement history with safe public rows", async () => {
    const state = { adminCalls: 0 };
    const server = createMovementServer({
      onAdminList() {
        state.adminCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      query: {
        locationSlug: "airport-store",
        movementType: "goods_receipt",
        page: "2",
        pageSize: "25",
        q: "rice",
      },
      url: "/api/admin/stock/movements",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].sourceReference, "SPR-2026-0004");
    assert.equal(response.json().page, 2);
    assert.equal(state.adminCalls, 1);
    assert.equal(Object.hasOwn(response.json().items[0], "sourceKey"), false);
  });

  it("checks manager location scope before listing movement rows", async () => {
    const state = { listCalls: 0, scopedChecks: 0 };
    const server = createMovementServer({
      onManagerList() {
        state.listCalls += 1;
      },
      onScopedPermissionCheck() {
        state.scopedChecks += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock/movements?locationSlug=airport-store",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().locationName, "Airport Store");
    assert.equal(state.scopedChecks, 1);
    assert.equal(state.listCalls, 1);
  });

  it("rejects manager movement history outside location scope", async () => {
    const state = { listCalls: 0 };
    const server = createMovementServer({
      onManagerList() {
        state.listCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock/movements?locationSlug=blocked-store",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.listCalls, 0);
  });

  it("returns 503 when movement services are unavailable", async () => {
    const server = createServer({
      accessControl: createAccessControl(),
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock/movements",
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().title, "Stock unavailable");
  });
});

function createMovementServer(input: {
  onAdminList?: () => void;
  onManagerList?: () => void;
  onScopedPermissionCheck?: () => void;
}) {
  const permissionService = createPermissionService(input);

  return createServer({
    accessControl: createAccessControl(permissionService),
    stockMovements: {
      permissionService,
      stockMovementQueryRepo: {
        async findLocationBySlug(slug) {
          if (slug === "airport-store") {
            return {
              id: ALLOWED_LOCATION_ID,
              name: "Airport Store",
              slug: "airport-store",
            };
          }
          if (slug === "blocked-store") {
            return {
              id: BLOCKED_LOCATION_ID,
              name: "Blocked Store",
              slug: "blocked-store",
            };
          }
          return null;
        },
        async listStockMovements(query) {
          input.onAdminList?.();
          assert.equal(query.locationSlug, "airport-store");
          return movementResult("Airport Store");
        },
        async listStockMovementsForLocation(query, location) {
          input.onManagerList?.();
          assert.equal(query.locationSlug, "airport-store");
          assert.equal(location.id, ALLOWED_LOCATION_ID);
          return movementResult(location.name);
        },
      },
    },
  });
}

function createAccessControl(permissionService = createPermissionService({})) {
  return {
    accessTokenAuthenticationService: {
      async authenticate() {
        return {
          userId: ACTOR_ID,
          userSlug: "store-manager",
        };
      },
    },
    permissionService,
  };
}

function createPermissionService(input: {
  onScopedPermissionCheck?: () => void;
}) {
  return {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      scope?: "any_active" | "contextual";
    }) {
      if (args.scope === "any_active") return;
      if (args.permission === "inventory.read") return;

      input.onScopedPermissionCheck?.();
      if (args.locationId !== ALLOWED_LOCATION_ID) {
        throw new AppError({
          code: "forbidden",
          detail: "You do not have permission to view stock at this location.",
          statusCode: 403,
          title: "Forbidden",
        });
      }
    },
  };
}

function movementResult(locationName: string) {
  return {
    items: [movementRow(locationName)],
    locationName,
    totalCount: 1,
  };
}

function movementRow(locationName: string): StockMovementSummary {
  return {
    actorName: "Ama Manager",
    actorUserSlug: "ama-manager",
    locationName,
    locationSlug: "airport-store",
    movementType: "goods_receipt",
    note: "Received against PO",
    occurredAt: "2026-05-13T08:00:00.000Z",
    productName: "Rice",
    productSlug: "rice",
    quantityDelta: 10,
    reasonCode: null,
    sku: "RICE-5KG",
    sourceReference: "SPR-2026-0004",
    sourceType: "supplier_procurement_receipt",
    variantName: "5kg",
    variantSlug: "rice-5kg",
  };
}

function authHeaders() {
  const { token } = issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: ACTOR_ID,
    userSlug: "store-manager",
  });

  return { authorization: `Bearer ${token}` };
}
