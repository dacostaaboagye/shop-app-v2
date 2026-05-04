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

describe("opening stock routes", () => {
  it("passes the authenticated actor to admin opening stock setup", async () => {
    const state: {
      initializedBy: string | null;
      initializedBySlug: string | null;
    } = { initializedBy: null, initializedBySlug: null };
    const server = createOpeningStockServer({
      onOpening(input) {
        state.initializedBy = input.initializedBy ?? null;
        state.initializedBySlug = input.initializedBySlug ?? null;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        lines: [{ onHandQuantity: 12, sku: "RICE-5KG" }],
        locationSlug: "downtown-store",
        sourceType: "physical_count",
      },
      url: "/api/admin/stock/balances/opening",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().initializedCount, 1);
    assert.equal(state.initializedBy, ACTOR_ID);
    assert.equal(state.initializedBySlug, ACTOR_SLUG);
  });

  it("allows a manager to initialize opening stock at an authorized location", async () => {
    const state = {
      openingCalls: 0,
      scopedPermissionChecks: 0,
    };
    const server = createOpeningStockServer({
      onOpening() {
        state.openingCalls += 1;
      },
      onPermissionCheck(args) {
        if (args.scope !== "any_active") {
          state.scopedPermissionChecks += 1;
        }
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        lines: [{ onHandQuantity: 12, sku: "RICE-5KG" }],
        locationSlug: "downtown-store",
        sourceReference: "opening-sheet-1",
        sourceType: "physical_count",
      },
      url: "/api/manager/stock/balances/opening",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.openingCalls, 1);
    assert.equal(state.scopedPermissionChecks, 1);
  });

  it("rejects manager opening stock setup outside the selected location scope", async () => {
    const state = { openingCalls: 0 };
    const server = createOpeningStockServer({
      onOpening() {
        state.openingCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        lines: [{ onHandQuantity: 12, sku: "RICE-5KG" }],
        locationSlug: "airport-store",
        sourceType: "physical_count",
      },
      url: "/api/manager/stock/balances/opening",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.openingCalls, 0);
  });
});

function createOpeningStockServer(input: {
  onOpening?: (input: {
    initializedBy?: string;
    initializedBySlug?: string;
    lines: Array<{ onHandQuantity: number; sku: string }>;
    locationSlug: string;
    note?: string | undefined;
    sourceReference?: string | undefined;
    sourceType: string;
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
        detail:
          "You do not have permission to initialize stock at this location.",
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
      openingStockRepo: {
        async findOpeningLocationBySlug(locationSlug) {
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
        async initializeOpeningStock(openingInput) {
          input.onOpening?.(openingInput);
          return {
            initializedCount: openingInput.lines.length,
            items: openingInput.lines.map((line) => ({
              availableQuantity: line.onHandQuantity,
              inTransitQuantity: 0,
              locationName: "Downtown Store",
              locationSlug: openingInput.locationSlug,
              note: openingInput.note ?? null,
              onHandQuantity: line.onHandQuantity,
              openingQuantity: line.onHandQuantity,
              productName: "Rice",
              productSlug: "rice",
              reservedQuantity: 0,
              sku: line.sku,
              updatedAt: NOW.toISOString(),
              variantName: "5kg",
              variantSlug: "rice-5kg",
            })),
            locationName: "Downtown Store",
            locationSlug: openingInput.locationSlug,
            sourceKey: openingInput.sourceReference ?? "generated-source",
            sourceType: openingInput.sourceType,
          };
        },
      },
      permissionService,
      stockCountRepo: {
        async findCountLocationBySlug() {
          return null;
        },
        async setOnHandQuantity() {
          throw new Error("Stock count was not expected.");
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
