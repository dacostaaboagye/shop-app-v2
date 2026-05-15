import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stockTakeCreateRateLimit,
  stockTakeSheetDownloadRateLimit,
} from "../src/modules/stock/stock-take.routes.js";
import { stockTakeImportWriteRateLimit } from "../src/modules/stock/stock-take-import.routes.js";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take route rate limits", () => {
  it("limits stock-take generation before creating more sessions", async () => {
    let createCalls = 0;
    const server = createStockTakeServer({
      onCreate() {
        createCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from({ length: stockTakeCreateRateLimit.max + 1 }, () =>
        server.inject({
          headers: authHeaders(),
          method: "POST",
          payload: { locationSlug: "downtown-store", mode: "blind" },
          url: "/api/admin/stock-takes",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(createCalls, stockTakeCreateRateLimit.max);
  });

  it("limits stock-take import writes before parsing more uploads", async () => {
    let dryRunCalls = 0;
    const server = createStockTakeServer({
      onDryRun() {
        dryRunCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from({ length: stockTakeImportWriteRateLimit.max + 1 }, () =>
        server.inject({
          headers: authHeaders(),
          method: "POST",
          payload: {
            contentType: "text/csv",
            csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
            fileName: "stock-take.csv",
          },
          url: "/api/admin/stock-takes/STKTAKE-2026-0001/imports/dry-run",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(dryRunCalls, stockTakeImportWriteRateLimit.max);
  });

  it("limits generated sheet downloads before rendering more exports", async () => {
    let getSessionCalls = 0;
    const server = createStockTakeServer({
      onGetSession() {
        getSessionCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from({ length: stockTakeSheetDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: authHeaders(),
          method: "GET",
          url: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(getSessionCalls, stockTakeSheetDownloadRateLimit.max);
  });

  it("declares dedicated limits for stock-take expensive routes", () => {
    assert.deepEqual(stockTakeCreateRateLimit, {
      groupId: "stock-take-create",
      max: 10,
      timeWindow: "15 minutes",
    });
    assert.deepEqual(stockTakeImportWriteRateLimit, {
      groupId: "stock-take-import-write",
      max: 5,
      timeWindow: "15 minutes",
    });
    assert.deepEqual(stockTakeSheetDownloadRateLimit, {
      groupId: "stock-take-sheet-download",
      max: 30,
      timeWindow: "1 minute",
    });
  });
});
