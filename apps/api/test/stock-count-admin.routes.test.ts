import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-08T12:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_SLUG = "store-manager";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";

describe("stock count routes", () => {
  it("allows a manager to count stock at an authorized location", async () => {
    const state = {
      anyActivePermissionChecks: 0,
      countCalls: 0,
      scopedPermissionChecks: 0,
    };
    const server = createStockCountServer({
      onCount() {
        state.countCalls += 1;
      },
      onPermissionCheck(args) {
        if (args.scope === "any_active") {
          state.anyActivePermissionChecks += 1;
          return;
        }
        state.scopedPermissionChecks += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        locationSlug: "downtown-store",
        onHandQuantity: 12,
        sku: "RICE-5KG",
      },
      url: "/api/manager/stock/balances/count",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().onHandQuantity, 12);
    assert.equal(state.countCalls, 1);
    assert.equal(state.anyActivePermissionChecks, 1);
    assert.equal(state.scopedPermissionChecks, 1);
  });

  it("rejects a manager stock count outside the selected location scope", async () => {
    const state = { countCalls: 0 };
    const server = createStockCountServer({
      onCount() {
        state.countCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        locationSlug: "airport-store",
        onHandQuantity: 12,
        sku: "RICE-5KG",
      },
      url: "/api/manager/stock/balances/count",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.countCalls, 0);
  });

  it("passes the authenticated actor to admin stock counts", async () => {
    const state: {
      countedBy: string | null;
      countedBySlug: string | null;
    } = { countedBy: null, countedBySlug: null };
    const server = createStockCountServer({
      onCount(input) {
        state.countedBy = input.countedBy ?? null;
        state.countedBySlug = input.countedBySlug ?? null;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        locationSlug: "downtown-store",
        onHandQuantity: 8,
        sku: "RICE-5KG",
      },
      url: "/api/admin/stock/balances/count",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.countedBy, ACTOR_ID);
    assert.equal(state.countedBySlug, ACTOR_SLUG);
  });
});

function createStockCountServer(input: {
  onCount?: (input: {
    countedBy?: string;
    countedBySlug?: string;
    locationSlug: string;
    onHandQuantity: number;
    sku: string;
  }) => void;
  onPermissionCheck?: (input: {
    locationId?: string;
    permission: string;
    scope?: "any_active" | "contextual";
  }) => void;
}) {
  const permissionService = {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      scope?: "any_active" | "contextual";
    }) {
      input.onPermissionCheck?.(args);
      if (!args.locationId || args.locationId === ALLOWED_LOCATION_ID) return;

      throw new AppError({
        code: "forbidden",
        detail: "You do not have permission to count stock at this location.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
  };

  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return {
            userId: ACTOR_ID,
            userSlug: ACTOR_SLUG,
          };
        },
      },
      permissionService,
    },
    stockCount: {
      permissionService,
      stockCountRepo: {
        async findCountLocationBySlug(locationSlug) {
          if (locationSlug === "airport-store") {
            return {
              id: BLOCKED_LOCATION_ID,
              name: "Airport Store",
              slug: "airport-store",
            };
          }

          return {
            id: ALLOWED_LOCATION_ID,
            name: "Downtown Store",
            slug: "downtown-store",
          };
        },
        async setOnHandQuantity(countInput) {
          input.onCount?.(countInput);
          return {
            availableQuantity: countInput.onHandQuantity,
            inTransitQuantity: 0,
            locationName: "Downtown Store",
            locationSlug: countInput.locationSlug,
            onHandQuantity: countInput.onHandQuantity,
            productName: "Rice",
            productSlug: "rice",
            reservedQuantity: 0,
            sku: countInput.sku,
            skuId: SKU_ID,
            updatedAt: NOW.toISOString(),
            variantName: "5kg",
            variantSlug: "rice-5kg",
          };
        },
      },
    },
  });
}

function authHeaders() {
  const { token } = issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: ACTOR_ID,
    userSlug: ACTOR_SLUG,
  });

  return { authorization: `Bearer ${token}` };
}
