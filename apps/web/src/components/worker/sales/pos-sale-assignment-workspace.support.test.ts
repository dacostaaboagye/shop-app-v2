import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CurrentAssignment } from "@shop/contracts";
import {
  filterSaleAssignments,
  getSaleAssignmentFilterOptions,
} from "./pos-sale-assignment-workspace.support";

const ASSIGNMENTS: CurrentAssignment[] = [
  createAssignment({
    brandName: "Acme",
    brandSlug: "acme",
    categoryName: "Phones",
    categorySlug: "phones",
    productName: "Acme Phone",
    sku: "ACME-PHONE-BLK",
    skuId: "11111111-1111-4111-8111-111111111111",
    variantName: "Black",
  }),
  createAssignment({
    brandName: "Bravo",
    brandSlug: "bravo",
    categoryName: "Accessories",
    categorySlug: "accessories",
    productName: "Bravo Charger",
    sku: "BRAVO-CHARGE-20W",
    skuId: "22222222-2222-4222-8222-222222222222",
    variantName: "20W",
  }),
  createAssignment({
    brandName: "Acme",
    brandSlug: "acme",
    categoryName: "Accessories",
    categorySlug: "accessories",
    productName: "Acme Cable",
    sku: "ACME-CABLE-USBC",
    skuId: "33333333-3333-4333-8333-333333333333",
    variantName: "USB-C",
  }),
];

describe("POS sale assignment filtering", () => {
  it("filters assigned products by brand, category, and search text", () => {
    const result = filterSaleAssignments(ASSIGNMENTS, {
      brandSlug: "acme",
      categorySlug: "accessories",
      search: "cable",
    });

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("matches search text across product name, variant name, and sku", () => {
    assert.deepEqual(
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        search: "phone",
      }).map((assignment) => assignment.sku),
      ["ACME-PHONE-BLK"],
    );

    assert.deepEqual(
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        search: "20w",
      }).map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W"],
    );

    assert.deepEqual(
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        search: "acme-cable",
      }).map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("treats search text as case-insensitive and trims surrounding whitespace", () => {
    const result = filterSaleAssignments(ASSIGNMENTS, {
      brandSlug: "",
      categorySlug: "",
      search: "  usb-c  ",
    });

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("preserves assignment order after filtering larger result sets", () => {
    const result = filterSaleAssignments(
      [
        ...ASSIGNMENTS,
        createAssignment({
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Acme Adapter",
          sku: "ACME-ADAPTER-65W",
          skuId: "44444444-4444-4444-8444-444444444444",
          variantName: "65W",
        }),
        createAssignment({
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Acme Dock",
          sku: "ACME-DOCK-USB4",
          skuId: "55555555-5555-4555-8555-555555555555",
          variantName: "USB4",
        }),
      ],
      {
        brandSlug: "acme",
        categorySlug: "accessories",
        search: "acme",
      },
    );

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC", "ACME-ADAPTER-65W", "ACME-DOCK-USB4"],
    );
  });

  it("builds unique sorted brand filter options", () => {
    assert.deepEqual(
      getSaleAssignmentFilterOptions(ASSIGNMENTS, "brandSlug", "brandName"),
      [
        { label: "Acme", value: "acme" },
        { label: "Bravo", value: "bravo" },
      ],
    );
  });

  it("builds unique sorted category options and skips missing values", () => {
    const result = getSaleAssignmentFilterOptions(
      [
        ...ASSIGNMENTS,
        createAssignment({
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Audio",
          categorySlug: "audio",
          productName: "Acme Speaker",
          sku: "ACME-SPEAKER-BT",
          skuId: "66666666-6666-4666-8666-666666666666",
          variantName: "Bluetooth",
        }),
        {
          ...createAssignment({
            brandName: "Delta",
            brandSlug: "delta",
            categoryName: "Ignored",
            categorySlug: "ignored",
            productName: "Delta Placeholder",
            sku: "DELTA-PLACEHOLDER",
            skuId: "77777777-7777-4777-8777-777777777777",
            variantName: "Ignored",
          }),
          categoryName: null,
          categorySlug: null,
        },
      ],
      "categorySlug",
      "categoryName",
    );

    assert.deepEqual(result, [
      { label: "Accessories", value: "accessories" },
      { label: "Audio", value: "audio" },
      { label: "Phones", value: "phones" },
    ]);
  });
});

function createAssignment(
  input: Pick<
    CurrentAssignment,
    | "brandName"
    | "brandSlug"
    | "categoryName"
    | "categorySlug"
    | "productName"
    | "sku"
    | "skuId"
    | "variantName"
  >,
): CurrentAssignment {
  return {
    availableQuantity: 5,
    brandName: input.brandName,
    brandSlug: input.brandSlug,
    categoryName: input.categoryName,
    categorySlug: input.categorySlug,
    effectiveFrom: "2026-04-21T10:00:00.000Z",
    locationId: "44444444-4444-4444-8444-444444444444",
    onHandQuantity: 5,
    primaryImageUrl: "/uploads/product.png",
    productName: input.productName,
    productSlug: input.productName.toLowerCase().replaceAll(" ", "-"),
    quantity: 5,
    sellingPrice: "120.00",
    sku: input.sku,
    skuId: input.skuId,
    variantName: input.variantName,
    variantSlug: input.variantName.toLowerCase().replaceAll(" ", "-"),
    workerId: "55555555-5555-4555-8555-555555555555",
  };
}
