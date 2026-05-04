import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockTakeLine } from "@shop/contracts";
import { buildStockTakeSessionDetail } from "../src/modules/stock/postgres-stock-take.repository-support.js";

const GENERATED_AT = new Date("2026-05-04T10:00:00.000Z");

describe("stock take session detail mapping", () => {
  it("masks expected quantities for blind count details", () => {
    const detail = buildStockTakeSessionDetail({
      appliedAt: null,
      appliedByUserSlug: null,
      generatedAt: GENERATED_AT,
      generatedByUserSlug: "manager",
      lines: [createLine()],
      location: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Downtown Store",
        slug: "downtown-store",
      },
      mode: "blind",
      portal: "manager",
      reference: "STKTAKE-2026-0001",
      status: "generated",
    });

    assert.equal(detail.lines[0]?.systemOnHand, null);
    assert.equal(detail.lines[0]?.reservedQuantity, null);
    assert.equal(detail.lines[0]?.availableQuantity, null);
    assert.equal(detail.lines[0]?.variance, null);
  });

  it("preserves expected quantities for assisted count details", () => {
    const detail = buildStockTakeSessionDetail({
      appliedAt: null,
      appliedByUserSlug: null,
      generatedAt: GENERATED_AT,
      generatedByUserSlug: "manager",
      lines: [createLine()],
      location: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Downtown Store",
        slug: "downtown-store",
      },
      mode: "assisted",
      portal: "manager",
      reference: "STKTAKE-2026-0001",
      status: "generated",
    });

    assert.equal(detail.lines[0]?.systemOnHand, 10);
    assert.equal(detail.lines[0]?.reservedQuantity, 2);
    assert.equal(detail.lines[0]?.availableQuantity, 8);
  });
});

function createLine(): StockTakeLine {
  return {
    appliedDelta: null,
    availableQuantity: 8,
    countedQuantity: null,
    lineNumber: 1,
    note: null,
    productName: "Rice",
    productSlug: "rice",
    reservedQuantity: 2,
    rowStatus: "catalog_sku",
    sku: "RICE-5KG",
    systemOnHand: 10,
    unitOfMeasure: "bag",
    variance: null,
    variantName: "5kg",
    variantSlug: "rice-5kg",
  };
}
