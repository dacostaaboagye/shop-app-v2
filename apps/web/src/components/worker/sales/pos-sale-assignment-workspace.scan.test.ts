import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterSaleAssignments,
  getFirstAddableSaleAssignment,
  getSaleAssignmentSearchMatchState,
  isLikelySkuSearch,
} from "./pos-sale-assignment-workspace.support";
import {
  createAssignment,
  DEFAULT_ASSIGNMENTS,
} from "./pos-sale-assignment-workspace.test-support";

describe("POS sale assignment scan support", () => {
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
      DEFAULT_ASSIGNMENTS,
      "BRAVO-CHARGE-20W",
    );
    assert.equal(exactMatch?.kind, "exact_sku");
    assert.equal(exactMatch?.assignment.sku, "BRAVO-CHARGE-20W");

    const prefixMatch = getSaleAssignmentSearchMatchState(
      DEFAULT_ASSIGNMENTS,
      "ACME-C",
    );
    assert.equal(prefixMatch?.kind, "prefix_sku");
    assert.equal(prefixMatch?.assignment.sku, "ACME-CABLE-USBC");

    assert.equal(
      getSaleAssignmentSearchMatchState(DEFAULT_ASSIGNMENTS, "charger"),
      null,
    );
  });
});
