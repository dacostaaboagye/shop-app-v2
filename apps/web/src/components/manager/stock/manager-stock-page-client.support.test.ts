import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminStockBalanceSummary } from "@shop/contracts";
import { toSupplyRequestTarget } from "./manager-stock-page-client.support";

describe("manager stock page support", () => {
  it("maps stock rows to supply request targets using the selected destination location", () => {
    const row: AdminStockBalanceSummary = {
      availableQuantity: 4,
      inTransitQuantity: 1,
      locationName: "Store A",
      locationSlug: "store-a",
      onHandQuantity: 6,
      productName: "Travel Pack",
      productSlug: "travel-pack",
      reservedQuantity: 2,
      sku: "TRAVEL-PACK-001",
      skuId: "77777777-7777-4777-8777-777777777777",
      updatedAt: "2026-04-26T18:00:00.000Z",
      variantName: "Standard",
      variantSlug: "standard",
    };

    const target = toSupplyRequestTarget(row, {
      locationId: "22222222-2222-4222-8222-222222222221",
      locationName: "Store A",
    });

    assert.deepEqual(target, {
      locationId: "22222222-2222-4222-8222-222222222221",
      locationName: "Store A",
      productName: "Travel Pack",
      sku: "TRAVEL-PACK-001",
      skuId: "77777777-7777-4777-8777-777777777777",
      variantName: "Standard",
    });
  });
});
