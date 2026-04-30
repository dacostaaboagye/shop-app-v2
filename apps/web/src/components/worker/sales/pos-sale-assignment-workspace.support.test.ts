import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterSaleAssignments,
  getSaleAssignmentFilterOptions,
  paginateSaleAssignments,
  summarizeSaleAssignments,
} from "./pos-sale-assignment-workspace.support";
import {
  createAssignment,
  DEFAULT_ASSIGNMENTS,
} from "./pos-sale-assignment-workspace.test-support";

describe("POS sale assignment filtering", () => {
  it("filters assigned products by brand, category, and search text", () => {
    const result = filterSaleAssignments(DEFAULT_ASSIGNMENTS, {
      brandSlug: "acme",
      categorySlug: "accessories",
      quickFilter: "all",
      search: "cable",
      sort: "name",
    });

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("matches search text across product name, variant name, and sku", () => {
    assert.deepEqual(
      filterSaleAssignments(DEFAULT_ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "phone",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["ACME-PHONE-BLK"],
    );

    assert.deepEqual(
      filterSaleAssignments(DEFAULT_ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "20w",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W"],
    );

    assert.deepEqual(
      filterSaleAssignments(DEFAULT_ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "acme-cable",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("treats search text as case-insensitive and trims surrounding whitespace", () => {
    const result = filterSaleAssignments(DEFAULT_ASSIGNMENTS, {
      brandSlug: "",
      categorySlug: "",
      quickFilter: "all",
      search: "  usb-c  ",
      sort: "name",
    });

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("sorts filtered assignments by name when name ordering is selected", () => {
    const result = filterSaleAssignments(
      [
        ...DEFAULT_ASSIGNMENTS,
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
        quickFilter: "all",
        search: "acme",
        sort: "name",
      },
    );

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-ADAPTER-65W", "ACME-CABLE-USBC", "ACME-DOCK-USB4"],
    );
  });

  it("builds unique sorted brand filter options", () => {
    assert.deepEqual(
      getSaleAssignmentFilterOptions(
        DEFAULT_ASSIGNMENTS,
        "brandSlug",
        "brandName",
      ),
      [
        { label: "Acme", value: "acme" },
        { label: "Bravo", value: "bravo" },
      ],
    );
  });

  it("builds unique sorted category options and skips missing values", () => {
    const result = getSaleAssignmentFilterOptions(
      [
        ...DEFAULT_ASSIGNMENTS,
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

  it("supports quick filters for low stock and in-cart variants", () => {
    const lowStock = filterSaleAssignments(
      [
        createAssignment({
          availableQuantity: 8,
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
          availableQuantity: 2,
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
          availableQuantity: 1,
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Acme Cable",
          sku: "ACME-CABLE-USBC",
          skuId: "33333333-3333-4333-8333-333333333333",
          variantName: "USB-C",
        }),
      ],
      {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "low_stock",
        search: "",
        sort: "name",
      },
    );

    assert.deepEqual(
      lowStock.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC", "BRAVO-CHARGE-20W"],
    );

    const inCart = filterSaleAssignments(
      DEFAULT_ASSIGNMENTS,
      {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "in_cart",
        search: "",
        sort: "name",
      },
      ["22222222-2222-4222-8222-222222222222"],
    );

    assert.deepEqual(
      inCart.map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W"],
    );
  });

  it("paginates filtered assignments without changing their order", () => {
    const result = paginateSaleAssignments(
      [
        ...DEFAULT_ASSIGNMENTS,
        createAssignment({
          brandName: "Cinder",
          brandSlug: "cinder",
          categoryName: "Audio",
          categorySlug: "audio",
          productName: "Cinder Speaker",
          sku: "CINDER-SPEAKER",
          skuId: "88888888-8888-4888-8888-888888888888",
          variantName: "Portable",
        }),
      ],
      2,
      2,
    );

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC", "CINDER-SPEAKER"],
    );
  });

  it("summarizes assignment counts for stock and cart overview", () => {
    const result = summarizeSaleAssignments(
      [
        createAssignment({
          availableQuantity: 0,
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
          availableQuantity: 2,
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
          availableQuantity: 8,
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Acme Cable",
          sku: "ACME-CABLE-USBC",
          skuId: "33333333-3333-4333-8333-333333333333",
          variantName: "USB-C",
        }),
      ],
      [
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ],
    );

    assert.deepEqual(result, {
      availableCount: 2,
      inCartCount: 2,
      lowStockCount: 1,
      outOfStockCount: 1,
      totalCount: 3,
    });
  });
});
