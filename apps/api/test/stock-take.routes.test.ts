import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTOR_ID,
  ACTOR_SLUG,
  authHeaders,
  createStockTakeServer,
} from "./stock-take-route-fixtures.js";

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

  it("passes admin stock-take dry-run uploads to the import service", async () => {
    const state = { dryRunCalls: 0, reference: "" };
    const server = createStockTakeServer({
      onDryRun(input) {
        state.dryRunCalls += 1;
        state.reference = input.reference;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
        fileName: "stock-take.csv",
      },
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/imports/dry-run",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().canApply, true);
    assert.equal(state.dryRunCalls, 1);
    assert.equal(state.reference, "STKTAKE-2026-0001");
  });

  it("passes reviewed admin stock-take apply uploads to the apply service", async () => {
    const state = { applyCalls: 0, reference: "", userId: "", userSlug: "" };
    const server = createStockTakeServer({
      onApply(input) {
        state.applyCalls += 1;
        state.reference = input.reference;
        state.userId = input.userId ?? "";
        state.userSlug = input.userSlug ?? "";
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
        fileName: "stock-take.csv",
        reviewed: true,
      },
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/apply",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "applied");
    assert.equal(state.applyCalls, 1);
    assert.equal(state.reference, "STKTAKE-2026-0001");
    assert.equal(state.userId, ACTOR_ID);
    assert.equal(state.userSlug, ACTOR_SLUG);
  });

  it("requires manager write scope before stock-take dry-run import", async () => {
    const state = { dryRunCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onDryRun() {
        state.dryRunCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
        fileName: "stock-take.csv",
      },
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/imports/dry-run",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.dryRunCalls, 0);
  });

  it("checks manager dry-run scope before parsing the upload body", async () => {
    const state = { dryRunCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onDryRun() {
        state.dryRunCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {},
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/imports/dry-run",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.dryRunCalls, 0);
  });

  it("requires manager write scope before stock-take apply", async () => {
    const state = { applyCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onApply() {
        state.applyCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
        fileName: "stock-take.csv",
        reviewed: true,
      },
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/apply",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.applyCalls, 0);
  });

  it("checks manager apply scope before parsing the upload body", async () => {
    const state = { applyCalls: 0 };
    const server = createStockTakeServer({
      blockedSessionReference: "STKTAKE-2026-0002",
      onApply() {
        state.applyCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {},
      url: "/api/manager/stock-takes/STKTAKE-2026-0002/apply",
    });

    assert.equal(response.statusCode, 403);
    assert.equal(state.applyCalls, 0);
  });

  it("requires explicit review confirmation before stock-take apply", async () => {
    const state = { applyCalls: 0 };
    const server = createStockTakeServer({
      onApply() {
        state.applyCalls += 1;
      },
    });

    const response = await server.inject({
      headers: authHeaders(),
      method: "POST",
      payload: {
        contentType: "text/csv",
        csv: "lineNumber,sku,countedQuantity\n1,RICE-5KG,12",
        fileName: "stock-take.csv",
      },
      url: "/api/admin/stock-takes/STKTAKE-2026-0001/apply",
    });

    assert.equal(response.statusCode, 400);
    assert.equal(state.applyCalls, 0);
  });
});
