import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@/lib/errors/app-error";
import {
  appendOpeningStockRow,
  buildOpeningStockRequest,
  canAppendOpeningStockRow,
  getOpeningStockReadyRows,
  getOpeningStockServerBlockedRowCount,
  getOpeningStockServerRowErrors,
  getOpeningStockVisibleReviewRows,
  hasOpeningStockDraft,
  isOpeningStockSkuInRows,
  MAX_OPENING_STOCK_ROWS,
  parseOpeningStockRows,
  removeOpeningStockRow,
  upsertOpeningStockRow,
} from "./opening-stock-setup.support";

test("opening stock parser accepts comma, tab, and whitespace rows", () => {
  const rows = parseOpeningStockRows("RICE-5KG,10\nSOAP-1L\t0\nOIL-1L 4");

  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.sku, "RICE-5KG");
  assert.equal(rows[1]?.onHandQuantity, 0);
  assert.equal(rows[2]?.onHandQuantity, 4);
  assert.equal(getOpeningStockReadyRows(rows).length, 3);
});

test("opening stock parser flags duplicates and invalid quantities", () => {
  const rows = parseOpeningStockRows("RICE-5KG,10\nrice-5kg,4\nSOAP-1L,-1");

  assert.match(rows[0]?.errors.join(" ") ?? "", /Duplicate SKU/);
  assert.match(rows[1]?.errors.join(" ") ?? "", /Duplicate SKU/);
  assert.match(rows[2]?.errors.join(" ") ?? "", /Quantity/);
  assert.equal(getOpeningStockReadyRows(rows).length, 0);
});

test("opening stock manual entry appends and removes rows safely", () => {
  const currentRows = appendOpeningStockRow({
    currentRows: "RICE-5KG,10",
    quantity: " 4 ",
    sku: " SOAP-1L ",
  });

  assert.equal(currentRows, "RICE-5KG,10\nSOAP-1L,4");
  assert.equal(
    appendOpeningStockRow({
      currentRows,
      quantity: "-1",
      sku: "OIL-1L",
    }),
    currentRows,
  );

  assert.equal(
    removeOpeningStockRow({
      index: 0,
      rows: parseOpeningStockRows(currentRows),
    }),
    "SOAP-1L,4",
  );
});

test("opening stock product selection upserts rows by SKU", () => {
  const rows = upsertOpeningStockRow({
    currentRows: "RICE-5KG,10\nSOAP-1L,4",
    quantity: "12",
    sku: "rice-5kg",
  });

  assert.equal(rows, "RICE-5KG,12\nSOAP-1L,4");
  assert.equal(
    upsertOpeningStockRow({
      currentRows: rows,
      quantity: "3",
      sku: "OIL-1L",
    }),
    "RICE-5KG,12\nSOAP-1L,4\nOIL-1L,3",
  );
  assert.equal(
    isOpeningStockSkuInRows({
      rows: parseOpeningStockRows(rows),
      sku: "rice-5kg",
    }),
    true,
  );
});

test("opening stock manual entry only enables complete non-negative rows", () => {
  assert.equal(
    canAppendOpeningStockRow({ quantity: "0", sku: "RICE-5KG" }),
    true,
  );
  assert.equal(
    canAppendOpeningStockRow({ quantity: "", sku: "RICE-5KG" }),
    false,
  );
  assert.equal(
    canAppendOpeningStockRow({ quantity: "-1", sku: "RICE-5KG" }),
    false,
  );
  assert.equal(canAppendOpeningStockRow({ quantity: "1", sku: " " }), false);
  assert.equal(hasOpeningStockDraft({ quantity: "", sku: "" }), false);
  assert.equal(hasOpeningStockDraft({ quantity: "", sku: "RICE-5KG" }), true);
  assert.equal(hasOpeningStockDraft({ quantity: "1", sku: "" }), true);
});

test("opening stock removal preserves invalid rows for correction", () => {
  const rows = parseOpeningStockRows("RICE-5KG,10\nSOAP-1L,bad");

  assert.equal(
    removeOpeningStockRow({
      index: 0,
      rows,
    }),
    "SOAP-1L,",
  );
});

test("opening stock exposes the batch row limit for the workspace", () => {
  assert.equal(MAX_OPENING_STOCK_ROWS, 1000);
});

test("opening stock request includes only parsed row values and trimmed source", () => {
  const rows = parseOpeningStockRows("RICE-5KG,10");

  assert.deepEqual(
    buildOpeningStockRequest({
      locationSlug: "downtown-store",
      note: "  baseline  ",
      rows,
      sourceReference: " sheet-1 ",
      sourceType: "physical_count",
    }),
    {
      lines: [{ note: undefined, onHandQuantity: 10, sku: "RICE-5KG" }],
      locationSlug: "downtown-store",
      note: "baseline",
      sourceReference: "sheet-1",
      sourceType: "physical_count",
    },
  );
});

test("opening stock server row errors are mapped for review rows", () => {
  const errors = getOpeningStockServerRowErrors(
    new ApiError({
      problem: {
        code: "conflict",
        detail: "Blocked rows",
        details: {
          lines: [
            {
              index: 2,
              message: "SKU already initialized.",
              reason: "already_initialized",
              sku: "RICE-5KG",
            },
          ],
        },
        requestId: "req-1",
        status: 409,
        timestamp: new Date("2026-04-08T09:00:00.000Z").toISOString(),
        title: "Opening stock has blocked rows",
      },
      status: 409,
    }),
  );

  assert.deepEqual(errors, [
    {
      index: 2,
      message: "SKU already initialized.",
      reason: "already_initialized",
      sku: "RICE-5KG",
    },
  ]);
});

test("opening stock review keeps server-blocked rows visible beyond first 100 rows", () => {
  const rawRows = Array.from(
    { length: 101 },
    (_, index) => `SKU-${String(index + 1).padStart(3, "0")},1`,
  ).join("\n");
  const rows = parseOpeningStockRows(rawRows);

  const visibleRows = getOpeningStockVisibleReviewRows({
    rows,
    serverErrors: [
      {
        index: 100,
        message: "SKU already initialized.",
        reason: "already_initialized",
        sku: "SKU-101",
      },
    ],
  });

  assert.equal(visibleRows.length, 101);
  assert.equal(visibleRows.at(-1)?.row.sku, "SKU-101");
});

test("opening stock server-blocked rows gate only matching current rows", () => {
  const serverErrors = [
    {
      index: 1,
      message: "SKU already initialized.",
      reason: "already_initialized",
      sku: "SOAP-1L",
    },
  ];

  assert.equal(
    getOpeningStockServerBlockedRowCount({
      rows: parseOpeningStockRows("RICE-5KG,10\nSOAP-1L,4"),
      serverErrors,
    }),
    1,
  );
  assert.equal(
    getOpeningStockServerBlockedRowCount({
      rows: parseOpeningStockRows("RICE-5KG,10"),
      serverErrors,
    }),
    0,
  );
  assert.equal(
    getOpeningStockServerBlockedRowCount({
      rows: parseOpeningStockRows("RICE-5KG,10\nOIL-1L,2"),
      serverErrors,
    }),
    0,
  );
  assert.equal(
    getOpeningStockServerBlockedRowCount({
      rows: parseOpeningStockRows("RICE-5KG,10\nOIL-1L,2"),
      serverErrors: [
        {
          index: 1,
          message: "Row is blocked.",
          reason: "blocked",
          sku: null,
        },
      ],
    }),
    1,
  );
});
