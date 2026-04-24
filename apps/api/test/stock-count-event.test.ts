import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStockCountEvent } from "../src/modules/stock/stock-count-event.js";

describe("createStockCountEvent", () => {
  it("creates an operator-readable stock count event", () => {
    const event = createStockCountEvent({
      actor: { userSlug: "admin-user" },
      countedAt: new Date("2026-04-22T09:00:00.000Z"),
      locationId: "11111111-1111-4111-8111-111111111111",
      locationName: "Airport Store",
      locationSlug: "airport-store",
      nextOnHandQuantity: 8,
      previousOnHandQuantity: 3,
      productName: "Travel Pack",
      sku: "TRAVEL-001",
      skuId: "22222222-2222-4222-8222-222222222222",
      variantName: "Default",
    });

    assert.equal(event.type, "stock.count.updated");
    assert.equal(
      event.summary,
      "Stock count updated for Travel Pack Default (TRAVEL-001) at Airport Store: 3 to 8 (+5).",
    );
    assert.deepEqual(event.audience, [
      {
        kind: "permission",
        locationId: "11111111-1111-4111-8111-111111111111",
        permission: "inventory.read",
      },
      { kind: "permission", permission: "admin.dashboard.view" },
    ]);
  });
});
