import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take XLSX routes", () => {
  it("downloads a generated XLSX workbook", async () => {
    const server = createStockTakeServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers["content-type"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.match(
      String(response.headers["content-disposition"]),
      /STKTAKE-2026-0001-sheet\.xlsx/,
    );
    assert.equal(response.rawPayload.subarray(0, 2).toString("utf8"), "PK");
  });

  it("requires manager location scope before downloading XLSX workbooks", async () => {
    const state = { getSessionCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onGetSession() {
        state.getSessionCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/sheet.xlsx",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.getSessionCalls, 0);
  });
});
