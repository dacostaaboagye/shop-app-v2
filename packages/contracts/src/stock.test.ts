import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeReservationListQuerySchema,
  activeReservationListResponseSchema,
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
});
