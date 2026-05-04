import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTOR_ID,
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take cancel routes", () => {
  it("cancels a generated admin stock-take session", async () => {
    const state = { reference: "", userId: "" };
    const server = createStockTakeServer({
      onCancel(input) {
        state.reference = input.reference;
        state.userId = input.userId ?? "";
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/cancel",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "cancelled");
    assert.equal(response.json().lines, undefined);
    assert.equal(state.reference, "STKTAKE-2026-0001");
    assert.equal(state.userId, ACTOR_ID);
  });

  it("requires manager write scope before cancellation", async () => {
    const state = { cancelCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onCancel() {
        state.cancelCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/cancel",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.cancelCalls, 0);
  });

  it("rejects deleting an applied stock-take session", async () => {
    const state = { cancelCalls: 0 };
    const server = createStockTakeServer({
      detailStatus: "applied",
      onCancel() {
        state.cancelCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/cancel",
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Stock take cannot be deleted");
    assert.equal(state.cancelCalls, 0);
  });
});
