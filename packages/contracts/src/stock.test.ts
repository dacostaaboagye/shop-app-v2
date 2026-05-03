import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeReservationListQuerySchema,
  activeReservationListResponseSchema,
  adminReservationQuerySchema,
  adminStockBalanceListResponseSchema,
  adminStockBalanceQuerySchema,
  adminStockCountRequestSchema,
  adminStockCountResponseSchema,
  locationReservationQuerySchema,
} from "./stock.js";

describe("stock contracts", () => {
  it("accepts a valid active reservation list query", () => {
    const parsed = activeReservationListQuerySchema.parse({
      limit: "25",
      locationId: "11111111-1111-4111-8111-111111111111",
      skuId: "22222222-2222-4222-8222-222222222222",
      sourceType: "ecommerce",
    });

    assert.equal(parsed.limit, 25);
    assert.equal(parsed.sourceType, "ecommerce");
  });

  it("accepts a valid active reservation list response", () => {
    const parsed = activeReservationListResponseSchema.parse({
      items: [
        {
          createdAt: new Date("2026-04-08T09:00:00.000Z").toISOString(),
          expiresAt: new Date("2026-04-08T10:00:00.000Z").toISOString(),
          locationId: "11111111-1111-4111-8111-111111111111",
          quantity: 3,
          skuId: "22222222-2222-4222-8222-222222222222",
          sourceKey: "order_123",
          sourceType: "ecommerce",
          status: "active",
          updatedAt: new Date("2026-04-08T09:00:00.000Z").toISOString(),
        },
      ],
    });

    assert.equal(parsed.items[0]?.quantity, 3);
  });

  it("accepts stock balances with in-transit quantities", () => {
    const parsed = adminStockBalanceListResponseSchema.parse({
      items: [
        {
          availableQuantity: 4,
          inTransitQuantity: 6,
          locationName: "Downtown Store",
          locationSlug: "downtown-store",
          onHandQuantity: 5,
          productName: "Rice",
          productSlug: "rice",
          reservedQuantity: 1,
          sku: "RICE-5KG",
          skuId: "22222222-2222-4222-8222-222222222222",
          updatedAt: new Date("2026-04-08T09:00:00.000Z").toISOString(),
          variantName: "5kg",
          variantSlug: "rice-5kg",
        },
      ],
      locationName: "Downtown Store",
      page: 1,
      pageSize: 50,
      totalCount: 1,
    });

    assert.equal(parsed.items[0]?.inTransitQuantity, 6);
  });

  it("accepts global admin stock filters without a location", () => {
    const parsed = adminStockBalanceQuerySchema.parse({
      brandSlug: "acme",
      categorySlug: "rice",
      pageSize: "50",
      q: "5kg",
    });

    assert.equal(parsed.locationSlug, "");
    assert.equal(parsed.brandSlug, "acme");
    assert.equal(parsed.categorySlug, "rice");
  });

  it("accepts global admin reservation filters without a location", () => {
    const parsed = adminReservationQuerySchema.parse({
      brandSlug: "acme",
      categorySlug: "rice",
      q: "5kg",
    });

    assert.equal(parsed.locationSlug, "");
    assert.equal(parsed.limit, 50);
  });

  it("requires reason-coded stock counts and accepts no-change responses", () => {
    const request = adminStockCountRequestSchema.parse({
      locationSlug: "downtown-store",
      note: " Opening shelf count. ",
      onHandQuantity: 10,
      reasonCode: "opening_count",
      sku: "RICE-5KG",
    });

    assert.equal(request.note, "Opening shelf count.");
    assert.equal(request.reasonCode, "opening_count");

    const response = adminStockCountResponseSchema.parse({
      availableQuantity: 10,
      inTransitQuantity: 0,
      locationName: "Downtown Store",
      locationSlug: "downtown-store",
      note: "Opening shelf count.",
      onHandQuantity: 10,
      previousOnHandQuantity: 10,
      productName: "Rice",
      productSlug: "rice",
      quantityDelta: 0,
      reasonCode: "opening_count",
      reservedQuantity: 0,
      sku: "RICE-5KG",
      skuId: "22222222-2222-4222-8222-222222222222",
      status: "no_change",
      updatedAt: new Date("2026-04-08T09:00:00.000Z").toISOString(),
      variantName: "5kg",
      variantSlug: "rice-5kg",
    });

    assert.equal(response.status, "no_change");
    assert.equal(response.quantityDelta, 0);
  });

  it("accepts location-scoped reservation filters", () => {
    const parsed = locationReservationQuerySchema.parse({
      locationId: "11111111-1111-4111-8111-111111111111",
      q: "rice",
    });

    assert.equal(parsed.locationId, "11111111-1111-4111-8111-111111111111");
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.q, "rice");
  });
});
