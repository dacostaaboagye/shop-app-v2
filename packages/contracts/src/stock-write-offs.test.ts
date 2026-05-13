import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  stockWriteOffRequestSchema,
  stockWriteOffResponseSchema,
} from "./stock-write-offs.js";

describe("stock write-off contracts", () => {
  it("accepts a valid write-off request with mandatory evidence", () => {
    const parsed = stockWriteOffRequestSchema.parse({
      locationSlug: "accra-store",
      note: "Three bags expired after water damage.",
      quantity: 3,
      reasonCode: "expired",
      sku: "RICE-5KG",
    });

    assert.equal(parsed.quantity, 3);
    assert.equal(parsed.reasonCode, "expired");
  });

  it("rejects missing notes and non-positive quantities", () => {
    assert.throws(() =>
      stockWriteOffRequestSchema.parse({
        locationSlug: "accra-store",
        note: "",
        quantity: 0,
        reasonCode: "damaged",
        sku: "RICE-5KG",
      }),
    );
  });

  it("keeps write-off responses free of raw internal identifiers", () => {
    const parsed = stockWriteOffResponseSchema.parse({
      availableQuantity: 7,
      locationName: "Accra Store",
      locationSlug: "accra-store",
      note: "Damaged during unloading.",
      onHandQuantity: 10,
      previousOnHandQuantity: 12,
      productName: "Rice",
      productSlug: "rice",
      quantityDelta: -2,
      reasonCode: "damaged",
      reservedQuantity: 3,
      sku: "RICE-5KG",
      updatedAt: new Date("2026-05-13T12:00:00.000Z").toISOString(),
      variantName: "5kg",
      variantSlug: "rice-5kg",
    });

    assert.equal("skuId" in parsed, false);
    assert.equal("locationId" in parsed, false);
  });
});
