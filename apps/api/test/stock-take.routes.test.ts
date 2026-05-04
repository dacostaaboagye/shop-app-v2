import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  StockTakeCreateRequest,
  StockTakeSessionDetail,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-04T10:00:00.000Z");
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_SLUG = "store-manager";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";

describe("stock take routes", () => {
  it("passes the authenticated actor to admin stock-take generation", async () => {
    const state = { generatedBy: "", generatedBySlug: "" };
    const server = createStockTakeServer({
      onCreate(input) {
        state.generatedBy = input.generatedBy ?? "";
        state.generatedBySlug = input.generatedBySlug ?? "";
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: { locationSlug: "downtown-store", mode: "blind" },
      url: "/api/admin/stock-takes",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().stockTakeReference, "STKTAKE-2026-0001");
    assert.equal(response.json().lineCount, 1);
    assert.equal(response.json().lines, undefined);
    assert.equal(state.generatedBy, ACTOR_ID);
    assert.equal(state.generatedBySlug, ACTOR_SLUG);
  });

  it("rejects manager stock-take generation outside location scope", async () => {
    const state = { createCalls: 0 };
    const server = createStockTakeServer({
      onCreate() {
        state.createCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: { locationSlug: "airport-store", mode: "assisted" },
      url: "/api/manager/stock-takes",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().title, "Forbidden");
    assert.equal(state.createCalls, 0);
  });

  it("requires manager location scope before returning stock-take details", async () => {
    const state = { detailCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onGetSession() {
        state.detailCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes/STKTAKE-2026-0002",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.detailCalls, 0);
  });

  it("returns masked quantity fields for blind stock-take details", async () => {
    const server = createStockTakeServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().mode, "blind");
    assert.equal(response.json().lines[0].systemOnHand, null);
    assert.equal(response.json().lines[0].reservedQuantity, null);
    assert.equal(response.json().lines[0].availableQuantity, null);
  });

  it("returns system quantity fields for assisted stock-take details", async () => {
    const server = createStockTakeServer({ detailMode: "assisted" });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().mode, "assisted");
    assert.equal(response.json().lines[0].systemOnHand, 10);
    assert.equal(response.json().lines[0].reservedQuantity, 2);
    assert.equal(response.json().lines[0].availableQuantity, 8);
  });

  it("downloads a generated CSV sheet", async () => {
    const server = createStockTakeServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "text/csv; charset=utf-8");
    assert.match(
      String(response.headers["content-disposition"]),
      /STKTAKE-2026-0001-downtown-store-sheet\.csv/,
    );
    assert.match(response.body, /lineNumber,productName,variantName,sku/);
  });
});

function createStockTakeServer(input: {
  blockedSessionReference?: string;
  detailMode?: "blind" | "assisted";
  onCreate?: (input: {
    generatedBy?: string;
    generatedBySlug?: string;
    request: StockTakeCreateRequest;
    portal: "admin" | "manager";
  }) => void;
  onGetSession?: () => void;
}) {
  const permissionService = {
    async assertHasPermission(args: { locationId?: string }) {
      if (!args.locationId || args.locationId === ALLOWED_LOCATION_ID) return;

      throw new AppError({
        code: "forbidden",
        detail: "You do not have permission to use stock takes here.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
  };

  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: ACTOR_ID, userSlug: ACTOR_SLUG };
        },
      },
      permissionService,
    },
    stockTake: {
      permissionService,
      stockTakeService: {
        async createSession(createInput) {
          input.onCreate?.(createInput);
          return createSessionDetail(createInput.request.mode);
        },
        async findLocationBySlug(locationSlug) {
          return locationSlug === "airport-store"
            ? {
                id: BLOCKED_LOCATION_ID,
                name: "Airport Store",
                slug: "airport-store",
              }
            : {
                id: ALLOWED_LOCATION_ID,
                name: "Downtown Store",
                slug: "downtown-store",
              };
        },
        async findSessionLocationByReference(reference) {
          return reference === input.blockedSessionReference
            ? {
                id: BLOCKED_LOCATION_ID,
                name: "Airport Store",
                slug: "airport-store",
              }
            : {
                id: ALLOWED_LOCATION_ID,
                name: "Downtown Store",
                slug: "downtown-store",
              };
        },
        async getSession() {
          input.onGetSession?.();
          return createSessionDetail(input.detailMode ?? "blind");
        },
      },
    },
  });
}

function createSessionDetail(
  mode: "blind" | "assisted",
): StockTakeSessionDetail {
  const shouldMask = mode === "blind";

  return {
    blankSheet: false,
    generatedAt: NOW.toISOString(),
    generatedByUserSlug: ACTOR_SLUG,
    lineCount: 1,
    lines: [
      {
        availableQuantity: shouldMask ? null : 8,
        barcode: "12345",
        countedQuantity: null,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        productSlug: "rice",
        reservedQuantity: shouldMask ? null : 2,
        rowStatus: "catalog_sku",
        sku: "RICE-5KG",
        systemOnHand: shouldMask ? null : 10,
        unitOfMeasure: "bag",
        variance: null,
        variantName: "5kg",
        variantSlug: "rice-5kg",
      },
    ],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode,
    printableBookletUrl: "/admin/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
  };
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
