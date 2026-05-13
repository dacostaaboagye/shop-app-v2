import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWriteOffRequest,
  validateWriteOffNote,
  validateWriteOffQuantity,
} from "./stock-write-off-form.support";

test("write-off quantity validation caps quantity by available stock", () => {
  assert.equal(
    validateWriteOffQuantity("0", 5),
    "Quantity must be greater than zero.",
  );
  assert.equal(
    validateWriteOffQuantity("6", 5),
    "Quantity cannot exceed available stock (5).",
  );
  assert.equal(validateWriteOffQuantity("5", 5), undefined);
});

test("write-off request uses public SKU and trims mandatory note", () => {
  const request = buildWriteOffRequest({
    locationSlug: "accra-store",
    row: {
      availableQuantity: 5,
      inTransitQuantity: 0,
      locationName: "Accra Store",
      locationSlug: "accra-store",
      onHandQuantity: 7,
      productName: "Rice",
      productSlug: "rice",
      reservedQuantity: 2,
      sku: "RICE-5KG",
      skuId: "11111111-1111-4111-8111-111111111111",
      updatedAt: "2026-05-13T12:00:00.000Z",
      variantName: "5kg",
      variantSlug: "rice-5kg",
    },
    values: {
      note: "  damaged during unloading  ",
      quantity: "2",
      reasonCode: "damaged",
    },
  });

  assert.equal(request.sku, "RICE-5KG");
  assert.equal(request.note, "damaged during unloading");
  assert.equal(validateWriteOffNote(request.note), undefined);
});
