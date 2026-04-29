import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CurrentAssignment } from "@shop/contracts";
import {
  filterSaleAssignments,
  getFirstAddableSaleAssignment,
  getSaleAssignmentFilterOptions,
  getSaleAssignmentSearchMatchState,
  isLikelySkuSearch,
  paginateSaleAssignments,
  summarizeSaleAssignments,
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
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "phone",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["ACME-PHONE-BLK"],
    );

    assert.deepEqual(
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "20w",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W"],
    );

    assert.deepEqual(
      filterSaleAssignments(ASSIGNMENTS, {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "acme-cable",
        sort: "name",
      }).map((assignment) => assignment.sku),
      ["ACME-CABLE-USBC"],
    );
  });

  it("prioritizes exact and prefix sku matches for scan-style searches", () => {
    const result = filterSaleAssignments(
      [
        createAssignment({
          brandName: "Atlas",
          brandSlug: "atlas",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Atlas Dock",
          sku: "SCAN-2000",
          skuId: "99999999-9999-4999-8999-999999999999",
          variantName: "Desk",
        }),
        createAssignment({
          brandName: "Bravo",
          brandSlug: "bravo",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Scan Adapter",
          sku: "BRAVO-SCAN-20W",
          skuId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          variantName: "20W",
        }),
        createAssignment({
          brandName: "Cinder",
          brandSlug: "cinder",
          categoryName: "Accessories",
          categorySlug: "accessories",
          productName: "Portable Reader",
          sku: "SCAN-2",
          skuId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          variantName: "Mini",
        }),
      ],
      {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "scan-2",
        sort: "name",
      },
    );

    assert.deepEqual(
      result.map((assignment) => assignment.sku),
      ["SCAN-2", "SCAN-2000", "BRAVO-SCAN-20W"],
    );
  });

  it("treats search text as case-insensitive and trims surrounding whitespace", () => {
    const result = filterSaleAssignments(ASSIGNMENTS, {
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
      ASSIGNMENTS,
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

  it("sorts by price and stock for large assignment lists", () => {
    const byPriceDescending = filterSaleAssignments(
      [
        createAssignment({
          brandName: "Acme",
          brandSlug: "acme",
          categoryName: "Phones",
          categorySlug: "phones",
          productName: "Acme Phone",
          sellingPrice: "90.00",
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
          sellingPrice: "140.00",
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
          sellingPrice: "35.00",
          sku: "ACME-CABLE-USBC",
          skuId: "33333333-3333-4333-8333-333333333333",
          variantName: "USB-C",
        }),
      ],
      {
        brandSlug: "",
        categorySlug: "",
        quickFilter: "all",
        search: "",
        sort: "price_desc",
      },
    );

    assert.deepEqual(
      byPriceDescending.map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W", "ACME-PHONE-BLK", "ACME-CABLE-USBC"],
    );

    const byStockAscending = filterSaleAssignments(
      [
        createAssignment({
          availableQuantity: 10,
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
          availableQuantity: 1,
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
          availableQuantity: 6,
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
        quickFilter: "all",
        search: "",
        sort: "stock_asc",
      },
    );

    assert.deepEqual(
      byStockAscending.map((assignment) => assignment.sku),
      ["BRAVO-CHARGE-20W", "ACME-CABLE-USBC", "ACME-PHONE-BLK"],
    );
  });

  it("paginates filtered assignments without changing their order", () => {
    const result = paginateSaleAssignments(
      [
        ...ASSIGNMENTS,
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

  it("returns the first addable assignment for keyboard-first selling flow", () => {
    const result = getFirstAddableSaleAssignment([
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
        availableQuantity: 3,
        brandName: "Bravo",
        brandSlug: "bravo",
        categoryName: "Accessories",
        categorySlug: "accessories",
        productName: "Bravo Charger",
        sku: "BRAVO-CHARGE-20W",
        skuId: "22222222-2222-4222-8222-222222222222",
        variantName: "20W",
      }),
    ]);

    assert.equal(result?.sku, "BRAVO-CHARGE-20W");
    assert.equal(getFirstAddableSaleAssignment([]), null);
  });

  it("detects sku-like scan queries separately from browsing text", () => {
    assert.equal(isLikelySkuSearch("ACME-20W"), true);
    assert.equal(isLikelySkuSearch("scan/42"), true);
    assert.equal(isLikelySkuSearch("20w"), true);
    assert.equal(isLikelySkuSearch("charger"), false);
    assert.equal(isLikelySkuSearch("usb cable"), false);
  });

  it("returns exact and prefix sku match state for scan feedback", () => {
    const exactMatch = getSaleAssignmentSearchMatchState(
      ASSIGNMENTS,
      "BRAVO-CHARGE-20W",
    );
    assert.equal(exactMatch?.kind, "exact_sku");
    assert.equal(exactMatch?.assignment.sku, "BRAVO-CHARGE-20W");

    const prefixMatch = getSaleAssignmentSearchMatchState(
      ASSIGNMENTS,
      "ACME-C",
    );
    assert.equal(prefixMatch?.kind, "prefix_sku");
    assert.equal(prefixMatch?.assignment.sku, "ACME-CABLE-USBC");

    assert.equal(
      getSaleAssignmentSearchMatchState(ASSIGNMENTS, "charger"),
      null,
    );
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
  > & {
    availableQuantity?: number;
    sellingPrice?: string;
  },
): CurrentAssignment {
  return {
    availableQuantity: input.availableQuantity ?? 5,
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
    sellingPrice: input.sellingPrice ?? "120.00",
    sku: input.sku,
    skuId: input.skuId,
    variantName: input.variantName,
    variantSlug: input.variantName.toLowerCase().replaceAll(" ", "-"),
    workerId: "55555555-5555-4555-8555-555555555555",
  };
}
