import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

const REFERENCE = "STKTAKE-2026-0001";
const BLOCKED_REFERENCE = "STKTAKE-2026-0002";

describe("stock take line-count routes", () => {
  it("persists line-count entries against admin sessions", async () => {
    const state = { entries: 0, reference: "" };
    const server = createStockTakeServer({
      onUpdateLineCounts(input) {
        state.entries = input.entries.length;
        state.reference = input.reference;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {
        entries: [
          { countedQuantity: 12, lineNumber: 1, note: "front shelf" },
          { countedQuantity: null, lineNumber: 2, note: null },
        ],
      },
      url: `/api/admin/stock-takes/${REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().updatedCount, 2);
    assert.equal(response.json().stockTakeReference, REFERENCE);
    assert.equal(state.reference, REFERENCE);
    assert.equal(state.entries, 2);
  });

  it("requires manager write scope before persisting line-count entries", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: BLOCKED_REFERENCE,
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {
        entries: [{ countedQuantity: 5, lineNumber: 1, note: null }],
      },
      url: `/api/manager/stock-takes/${BLOCKED_REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.calls, 0);
  });

  it("rejects line-count updates against an applied session", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      detailStatus: "applied",
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {
        entries: [{ countedQuantity: 5, lineNumber: 1, note: null }],
      },
      url: `/api/admin/stock-takes/${REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().title, "Stock take cannot be edited");
    assert.equal(state.calls, 0);
  });

  it("rejects line-count updates against a cancelled session", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      detailStatus: "cancelled",
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {
        entries: [{ countedQuantity: 5, lineNumber: 1, note: null }],
      },
      url: `/api/admin/stock-takes/${REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 409);
    assert.equal(state.calls, 0);
  });

  it("rejects negative counted quantities at the contract boundary", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {
        entries: [{ countedQuantity: -1, lineNumber: 1, note: null }],
      },
      url: `/api/admin/stock-takes/${REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(state.calls, 0);
  });

  it("rejects empty entries arrays at the contract boundary", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: { entries: [] },
      url: `/api/admin/stock-takes/${REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(state.calls, 0);
  });

  it("checks manager write scope before parsing the body", async () => {
    const state = { calls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: BLOCKED_REFERENCE,
      onUpdateLineCounts() {
        state.calls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "PATCH",
      payload: {},
      url: `/api/manager/stock-takes/${BLOCKED_REFERENCE}/lines`,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.calls, 0);
  });
});
