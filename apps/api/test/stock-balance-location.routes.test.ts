import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-04-08T12:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const SKU_ID = "44444444-4444-4444-8444-444444444444";

describe("stock balance location routes", () => {
  it("lists manager stock balances for the requested scoped location", async () => {
    const state = { repoCalls: 0, scopedPermissionChecks: 0 };
    const server = createStockBalanceServer({
      onScopedPermissionCheck() {
        state.scopedPermissionChecks += 1;
      },
      onRepoCall() {
        state.repoCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/manager/stock/balances?locationId=${ALLOWED_LOCATION_ID}&page=1&pageSize=50`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].inTransitQuantity, 3);
    assert.equal(state.repoCalls, 1);
    assert.equal(state.scopedPermissionChecks, 1);
  });

  it("rejects manager stock balances outside the requested location scope", async () => {
    const state = { repoCalls: 0 };
    const server = createStockBalanceServer({
      onRepoCall() {
        state.repoCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/manager/stock/balances?locationId=${BLOCKED_LOCATION_ID}&page=1&pageSize=50`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.repoCalls, 0);
  });
});

function createStockBalanceServer(input: {
  onRepoCall?: () => void;
  onScopedPermissionCheck?: () => void;
}) {
  const permissionService = {
    async assertHasPermission(args: {
      locationId?: string;
      permission: string;
      scope?: "any_active" | "contextual";
    }) {
      if (args.scope === "any_active") return;
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

  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return {
            userId: ACTOR_ID,
            userSlug: "store-manager",
          };
        },
      },
      permissionService,
    },
    stockBalanceLocation: {
      permissionService,
      stockBalanceQueryRepo: {
        async listStockBalancesByLocationId() {
          input.onRepoCall?.();
          return {
            items: [
              {
                availableQuantity: 4,
                inTransitQuantity: 3,
                locationName: "Downtown Store",
                locationSlug: "downtown-store",
                onHandQuantity: 5,
                productName: "Rice",
                productSlug: "rice",
                reservedQuantity: 1,
                sku: "RICE-5KG",
                skuId: SKU_ID,
                updatedAt: NOW.toISOString(),
                variantName: "5kg",
                variantSlug: "rice-5kg",
              },
            ],
            locationName: "Downtown Store",
            totalCount: 1,
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
    userSlug: "store-manager",
  });

  return { authorization: `Bearer ${token}` };
}
