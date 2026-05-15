import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stockTakePdfDownloadRateLimit } from "../src/modules/stock/stock-take-pdf.routes.js";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take PDF routes", () => {
  it("downloads a generated booklet PDF", async () => {
    const server = createStockTakeServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/booklet.pdf",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.match(
      String(response.headers["content-disposition"]),
      /STKTAKE-2026-0001-booklet\.pdf/,
    );
    assert.equal(response.rawPayload.subarray(0, 4).toString("utf8"), "%PDF");
  });

  it("downloads a final variance report PDF only after apply", async () => {
    const server = createStockTakeServer({ reportStatus: "applied" });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/variance-report.pdf",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.match(
      String(response.headers["content-disposition"]),
      /STKTAKE-2026-0001-variance-report\.pdf/,
    );
    assert.equal(response.rawPayload.subarray(0, 4).toString("utf8"), "%PDF");
  });

  it("rejects variance reports for stock takes that are not applied", async () => {
    const server = createStockTakeServer({ reportStatus: "generated" });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/variance-report.pdf",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Variance report unavailable");
  });

  it("requires manager location scope before downloading PDFs", async () => {
    const state = { reportCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onGetVarianceReport() {
        state.reportCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/variance-report.pdf",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.reportCalls, 0);
  });

  it("limits booklet PDF downloads before rendering more booklets", async () => {
    let getSessionCalls = 0;
    const server = createStockTakeServer({
      onGetSession() {
        getSessionCalls += 1;
      },
    });

    const responses = await Promise.all(
      Array.from({ length: stockTakePdfDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: authHeaders(),
          method: "GET",
          url: "/api/admin/stock-takes/STKTAKE-2026-0001/booklet.pdf",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(getSessionCalls, stockTakePdfDownloadRateLimit.max);
  });

  it("limits variance report PDF downloads before rendering more reports", async () => {
    let reportCalls = 0;
    const server = createStockTakeServer({
      onGetVarianceReport() {
        reportCalls += 1;
      },
      reportStatus: "applied",
    });

    const responses = await Promise.all(
      Array.from({ length: stockTakePdfDownloadRateLimit.max + 1 }, () =>
        server.inject({
          headers: authHeaders(),
          method: "GET",
          url: "/api/admin/stock-takes/STKTAKE-2026-0001/variance-report.pdf",
        }),
      ),
    );

    const limitedResponse = responses.find(
      (response) => response.statusCode === 429,
    );
    assert.ok(limitedResponse);
    assert.equal(limitedResponse.statusCode, 429);
    assert.equal(limitedResponse.json().code, "rate_limited");
    assert.equal(reportCalls, stockTakePdfDownloadRateLimit.max);
  });

  it("declares a dedicated rate limit for generated PDF downloads", () => {
    assert.deepEqual(stockTakePdfDownloadRateLimit, {
      groupId: "stock-take-pdf-download",
      max: 30,
      timeWindow: "1 minute",
    });
  });
});
