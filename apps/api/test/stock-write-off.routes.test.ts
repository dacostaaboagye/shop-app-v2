import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockWriteOffResponse } from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-13T12:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("stock write-off routes", () => {
  it("records admin write-offs through the stock write-off repository", async () => {
    const state = { calls: 0 };
    const server = createWriteOffServer({
      onWriteOff() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: writeOffPayload("airport-store"),
      url: "/api/admin/stock/balances/write-off",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().quantityDelta, -2);
    assert.equal(Object.hasOwn(response.json(), "skuId"), false);
    assert.equal(state.calls, 1);
  });

  it("checks manager location scope before writing off stock", async () => {
    const state = { calls: 0, scopedChecks: 0 };
    const server = createWriteOffServer({
      onScopedPermissionCheck() {
        state.scopedChecks += 1;
      },
      onWriteOff() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: writeOffPayload("airport-store"),
      url: "/api/manager/stock/balances/write-off",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.scopedChecks, 1);
    assert.equal(state.calls, 1);
  });

  it("rejects manager write-offs outside location scope", async () => {
    const state = { calls: 0 };
    const server = createWriteOffServer({
      onWriteOff() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: writeOffPayload("blocked-store"),
      url: "/api/manager/stock/balances/write-off",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.calls, 0);
  });

  it("rejects write-offs without mandatory evidence", async () => {
    const server = createWriteOffServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: { ...writeOffPayload("airport-store"), note: "" },
      url: "/api/admin/stock/balances/write-off",
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().title, "Validation Error");
  });
});

function createWriteOffServer(input: {
  onScopedPermissionCheck?: () => void;
  onWriteOff?: () => void;
}) {
  const permissionService = createPermissionService(input);

  return createServer({
    accessControl: createAccessControl(permissionService),
    stockWriteOff: {
      permissionService,
      stockWriteOffRepo: {
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
        async writeOffStock(body) {
          input.onWriteOff?.();
          assert.equal(body.actorUserId, ACTOR_ID);
          assert.equal(body.reasonCode, "damaged");
          return writeOffResponse(body.locationSlug);
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
      if (args.permission === "inventory.write" && !args.locationId) return;

      input.onScopedPermissionCheck?.();
      if (args.locationId !== ALLOWED_LOCATION_ID) {
        throw new AppError({
          code: "forbidden",
          detail: "You do not have permission to write off stock here.",
          statusCode: 403,
          title: "Forbidden",
        });
      }
    },
  };
}

function writeOffPayload(locationSlug: string) {
  return {
    locationSlug,
    note: "Damaged during unloading.",
    quantity: 2,
    reasonCode: "damaged",
    sku: "RICE-5KG",
  };
}

function writeOffResponse(locationSlug: string): StockWriteOffResponse {
  return {
    availableQuantity: 6,
    locationName: "Airport Store",
    locationSlug,
    note: "Damaged during unloading.",
    onHandQuantity: 8,
    previousOnHandQuantity: 10,
    productName: "Rice",
    productSlug: "rice",
    quantityDelta: -2,
    reasonCode: "damaged",
    reservedQuantity: 2,
    sku: "RICE-5KG",
    updatedAt: "2026-05-13T12:00:00.000Z",
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
