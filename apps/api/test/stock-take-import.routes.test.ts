import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take import routes", () => {
  it("passes admin workbook dry-run uploads to the import service", async () => {
    const state = { contentType: "", reference: "" };
    const server = createStockTakeServer({
      onDryRun(input) {
        state.reference = input.reference;
        state.contentType = (
          input.request as { contentType: string }
        ).contentType;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "stock-take.xlsx",
        workbookBase64: "UEsDBAo=",
      },
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/imports/dry-run",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.reference, "STKTAKE-2026-0001");
    assert.equal(
      state.contentType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("allows workbook dry-run payloads above the default body limit", async () => {
    const state = { called: false };
    const server = createStockTakeServer({
      onDryRun() {
        state.called = true;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "stock-take.xlsx",
        workbookBase64: "A".repeat(1_100_000),
      },
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/imports/dry-run",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(state.called, true);
  });

  it("checks manager dry-run scope before parsing workbook uploads", async () => {
    let called = false;
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onDryRun() {
        called = true;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: "stock-take.xlsx",
        workbookBase64: "not-a-real-workbook",
      },
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/imports/dry-run",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(called, false);
  });
});
