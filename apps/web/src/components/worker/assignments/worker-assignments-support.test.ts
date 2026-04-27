import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBulkSupplyItems,
  filterAssignments,
  toggleSupplySelection,
  toSupplyTarget,
} from "./worker-assignments-support";

const ASSIGNMENT = {
  availableQuantity: 2,
  effectiveFrom: "2026-04-26T18:00:00.000Z",
  locationId: "22222222-2222-4222-8222-222222222221",
  onHandQuantity: 4,
  primaryImageUrl: null,
  productName: "Travel Pack",
  productSlug: "travel-pack",
  sellingPrice: "12.50",
  sku: "TRAVEL-PACK-001",
  skuId: "77777777-7777-4777-8777-777777777777",
  quantity: 4,
  variantName: "Standard",
  variantSlug: "standard",
  workerId: "11111111-1111-4111-8111-111111111111",
} as const;

describe("worker assignments support", () => {
  it("maps assignments into supply targets", () => {
    const target = toSupplyTarget({
      item: ASSIGNMENT,
      locationId: "22222222-2222-4222-8222-222222222221",
      locationName: "Store A",
    });

    assert.equal(target.locationName, "Store A");
    assert.equal(target.skuId, ASSIGNMENT.skuId);
  });

  it("toggles selected supply rows by sku id", () => {
    assert.deepEqual(toggleSupplySelection(["sku-1"], "sku-2"), [
      "sku-1",
      "sku-2",
    ]);
    assert.deepEqual(toggleSupplySelection(["sku-1", "sku-2"], "sku-1"), [
      "sku-2",
    ]);
  });

  it("builds grouped supply request items from selected targets", () => {
    const items = buildBulkSupplyItems(
      [
        {
          locationId: "location-1",
          locationName: "Store A",
          productName: "Travel Pack",
          sku: "TRAVEL-PACK-001",
          skuId: "sku-1",
          variantName: "Standard",
        },
        {
          locationId: "location-1",
          locationName: "Store A",
          productName: "Travel Pack",
          sku: "TRAVEL-PACK-002",
          skuId: "sku-2",
          variantName: "Large",
        },
      ],
      { "sku-1": 3, "sku-2": 1 },
    );

    assert.deepEqual(items, [
      { requestedQuantity: 3, skuId: "sku-1" },
      { requestedQuantity: 1, skuId: "sku-2" },
    ]);
  });

  it("keeps assignment filtering resilient while search and stock filters combine", () => {
    const results = filterAssignments({
      items: [
        ASSIGNMENT,
        {
          ...ASSIGNMENT,
          availableQuantity: 0,
          productName: "City Bag",
          sku: "CITY-BAG-001",
          skuId: "77777777-7777-4777-8777-777777777778",
          variantName: "Black",
        },
      ],
      search: "city",
      stockFilter: "out_of_stock",
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.productName, "City Bag");
  });
});
