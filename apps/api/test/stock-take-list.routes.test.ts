import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

describe("stock take list routes", () => {
  it("lists admin stock-take sessions without line details", async () => {
    const state = { listCalls: 0, portal: "" };
    const server = createStockTakeServer({
      onListSessions(input) {
        state.listCalls += 1;
        state.portal = input.portal;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/admin/stock-takes?page=1&pageSize=25",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.json().items[0].stockTakeReference,
      "STKTAKE-2026-0001",
    );
    assert.equal(response.json().items[0].lines, undefined);
    assert.equal(response.json().totalCount, 1);
    assert.equal(state.listCalls, 1);
    assert.equal(state.portal, "admin");
  });

  it("requires manager location scope before listing sessions", async () => {
    const state = { listCalls: 0 };
    const server = createStockTakeServer({
      onListSessions() {
        state.listCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes?locationSlug=airport-store",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.listCalls, 0);
  });

  it("lists manager sessions for the selected managed location", async () => {
    const state = { locationSlug: "", portal: "" };
    const server = createStockTakeServer({
      onListSessions(input) {
        state.locationSlug = input.locationSlug ?? "";
        state.portal = input.portal;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes?locationSlug=downtown-store",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().items.length, 1);
    assert.equal(state.locationSlug, "downtown-store");
    assert.equal(state.portal, "manager");
  });

  it("requires a location slug for manager stock-take history", async () => {
    const server = createStockTakeServer({});

    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: "/api/manager/stock-takes",
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().title, "Location required");
  });
});
