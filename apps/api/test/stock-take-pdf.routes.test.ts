import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
