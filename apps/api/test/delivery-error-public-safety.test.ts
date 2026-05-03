import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DeliveryInsufficientOriginStockError,
  DeliveryInvalidSourceQuantityError,
} from "../src/modules/deliveries/delivery-errors.js";

const INTERNAL_LOCATION_ID = "00000000-0000-4000-8000-000000000010";
const INTERNAL_SKU_ID = "00000000-0000-4000-8000-000000000020";

describe("delivery public error safety", () => {
  it("keeps delivery stock validation errors free of internal identifiers", () => {
    const invalidQuantityError = new DeliveryInvalidSourceQuantityError({
      quantity: 0,
      skuId: INTERNAL_SKU_ID,
      sourceReference: "WEB-20260501-0001",
      sourceType: "online_order",
    });
    const insufficientStockError = new DeliveryInsufficientOriginStockError({
      locationId: INTERNAL_LOCATION_ID,
      shortfalls: [
        {
          available: 1,
          requested: 2,
          skuId: INTERNAL_SKU_ID,
        },
      ],
      sourceReference: "WEB-20260501-0001",
      sourceType: "online_order",
    });

    for (const error of [invalidQuantityError, insufficientStockError]) {
      const serialized = JSON.stringify({
        detail: error.message,
        details: error.details,
      });
      assert.equal(serialized.includes(INTERNAL_LOCATION_ID), false);
      assert.equal(serialized.includes(INTERNAL_SKU_ID), false);
    }
  });
});
