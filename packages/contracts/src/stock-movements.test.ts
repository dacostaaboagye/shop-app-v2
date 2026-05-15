import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminStockMovementQuerySchema,
  managerStockMovementQuerySchema,
  stockMovementListResponseSchema,
} from "./stock-movements.js";

describe("stock movement contracts", () => {
  it("accepts admin movement filters without a location", () => {
    const parsed = adminStockMovementQuerySchema.parse({
      dateFrom: "2026-05-01",
      movementType: "goods_receipt",
      pageSize: "25",
      q: "rice",
      sourceType: "supplier_procurement_receipt",
    });

    assert.equal(parsed.locationSlug, "");
    assert.equal(parsed.pageSize, 25);
    assert.equal(parsed.movementType, "goods_receipt");
  });

  it("requires manager movement queries to name a location slug", () => {
    assert.throws(() => managerStockMovementQuerySchema.parse({}));

    const parsed = managerStockMovementQuerySchema.parse({
      locationSlug: "airport-store",
    });

    assert.equal(parsed.locationSlug, "airport-store");
    assert.equal(parsed.page, 1);
  });

  it("accepts public movement rows without internal identifiers", () => {
    const response = stockMovementListResponseSchema.parse({
      items: [
        {
          actorName: "Ama Manager",
          actorUserSlug: "ama-manager",
          locationName: "Airport Store",
          locationSlug: "airport-store",
          movementType: "goods_receipt",
          note: "Received from supplier",
          occurredAt: "2026-05-13T08:00:00.000Z",
          productName: "Rice",
          productSlug: "rice",
          quantityDelta: 10,
          reasonCode: null,
          sku: "RICE-5KG",
          sourceReference: "SPR-2026-0001",
          sourceType: "supplier_procurement_receipt",
          variantName: "5kg",
          variantSlug: "rice-5kg",
        },
      ],
      locationName: "Airport Store",
      page: 1,
      pageSize: 50,
      totalCount: 1,
    });

    assert.equal(response.items[0]?.sourceReference, "SPR-2026-0001");
    assert.equal(Object.hasOwn(response.items[0] ?? {}, "sourceKey"), false);
  });
});
