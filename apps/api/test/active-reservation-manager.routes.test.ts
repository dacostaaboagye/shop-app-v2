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

describe("active reservation manager routes", () => {
  it("lists reservations for an authorized manager location", async () => {
    const state = { repoCalls: 0, scopedPermissionChecks: 0 };
    const server = createReservationServer({
      onRepoCall() {
        state.repoCalls += 1;
      },
      onScopedPermissionCheck() {
        state.scopedPermissionChecks += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/manager/stock/reservations/active?locationId=${ALLOWED_LOCATION_ID}&limit=50&q=rice`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items[0].sku, "RICE-5KG");
    assert.equal(response.json().locationName, "Downtown Store");
    assert.equal(state.repoCalls, 1);
    assert.equal(state.scopedPermissionChecks, 1);
  });

  it("rejects reservations outside the manager location scope", async () => {
    const state = { repoCalls: 0 };
    const server = createReservationServer({
      onRepoCall() {
        state.repoCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/manager/stock/reservations/active?locationId=${BLOCKED_LOCATION_ID}&limit=50`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.repoCalls, 0);
  });
});

function createReservationServer(input: {
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
          detail: "You do not have permission to view reservations here.",
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
    stock: {
      permissionService,
      reservationQueryRepo: {
        async listReservations() {
          throw new Error("Admin reservation query should not be used.");
        },
        async listReservationsByLocationId(query) {
          input.onRepoCall?.();
          assert.equal(query.locationId, ALLOWED_LOCATION_ID);
          assert.equal(query.q, "rice");
          return {
            items: [
              {
                createdAt: NOW.toISOString(),
                expiresAt: null,
                locationName: "Downtown Store",
                locationSlug: "downtown-store",
                productName: "Rice",
                productSlug: "rice",
                quantity: 3,
                sku: "RICE-5KG",
                skuId: SKU_ID,
                sourceKey: "sale-draft-1",
                sourceType: "pos_sale",
                status: "active" as const,
                updatedAt: NOW.toISOString(),
                variantName: "5kg",
                variantSlug: "rice-5kg",
              },
            ],
            locationName: "Downtown Store",
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
