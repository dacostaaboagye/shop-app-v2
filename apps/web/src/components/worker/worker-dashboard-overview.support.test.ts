import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CurrentAssignment } from "@shop/contracts";
import { summarizeWorkerStock } from "./worker-dashboard-overview.support";

const ASSIGNMENTS: CurrentAssignment[] = [
  {
    availableQuantity: 8,
    effectiveFrom: "2026-04-29T08:00:00.000Z",
    locationId: "11111111-1111-1111-1111-111111111111",
    onHandQuantity: 8,
    productName: "Orange Juice",
    productSlug: "orange-juice",
    quantity: 10,
    sellingPrice: "15.00",
    sku: "OJ-001",
    skuId: "aaaaaaaa-1111-1111-1111-111111111111",
    variantName: "500ml",
    variantSlug: "500ml",
    workerId: "bbbbbbbb-1111-1111-1111-111111111111",
  },
  {
    availableQuantity: 2,
    effectiveFrom: "2026-04-29T08:00:00.000Z",
    locationId: "11111111-1111-1111-1111-111111111111",
    onHandQuantity: 2,
    productName: "Bottle Water",
    productSlug: "bottle-water",
    quantity: 4,
    sellingPrice: "5.00",
    sku: "BW-002",
    skuId: "aaaaaaaa-2222-1111-1111-111111111111",
    variantName: "1L",
    variantSlug: "1l",
    workerId: "bbbbbbbb-1111-1111-1111-111111111111",
  },
  {
    availableQuantity: 0,
    effectiveFrom: "2026-04-29T08:00:00.000Z",
    locationId: "11111111-1111-1111-1111-111111111111",
    onHandQuantity: 0,
    productName: "Soft Drink",
    productSlug: "soft-drink",
    quantity: 6,
    sellingPrice: "9.00",
    sku: "SD-003",
    skuId: "aaaaaaaa-3333-1111-1111-111111111111",
    variantName: "Can",
    variantSlug: "can",
    workerId: "bbbbbbbb-1111-1111-1111-111111111111",
  },
];

describe("worker dashboard overview support", () => {
  it("summarizes stock exposure and prioritizes urgent variants", () => {
    const summary = summarizeWorkerStock(ASSIGNMENTS);

    assert.equal(summary.assignedVariantCount, 3);
    assert.equal(summary.totalAssignedUnits, 20);
    assert.equal(summary.totalAvailableUnits, 10);
    assert.equal(summary.lowStockCount, 1);
    assert.equal(summary.outOfStockCount, 1);
    assert.deepEqual(
      summary.topRiskAssignments.map((assignment) => assignment.sku),
      ["SD-003", "BW-002"],
    );
  });
});
