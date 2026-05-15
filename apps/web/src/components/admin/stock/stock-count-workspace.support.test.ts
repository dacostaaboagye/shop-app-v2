import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AdminProductSummary,
  AdminStockBalanceSummary,
  AdminVariantSummary,
} from "@shop/contracts";
import {
  buildStockCountInitialTarget,
  buildStockCountProductQuery,
  findStockCountBalance,
  getActiveStockCountVariants,
} from "./stock-count-workspace.support";

describe("stock-count-workspace support", () => {
  it("builds a server-backed active product search query", () => {
    assert.deepEqual(
      buildStockCountProductQuery({ page: 2, search: " rice " }),
      {
        brandSlug: "",
        categorySlug: "",
        dir: "asc",
        page: 1,
        pageSize: 40,
        q: "rice",
        sort: "name",
        status: "active",
      },
    );
  });

  it("prefills a selected variant from the matching current balance", () => {
    const balance = findStockCountBalance({
      balances: [stockBalance({ onHandQuantity: 17, reservedQuantity: 3 })],
      sku: "RICE-5KG",
    });

    assert.deepEqual(
      buildStockCountInitialTarget({
        balance,
        product: productSummary(),
        variant: variantSummary(),
      }),
      {
        onHandQuantity: 17,
        productName: "Jasmine Rice",
        reservedQuantity: 3,
        sku: "RICE-5KG",
        variantName: "5kg bag",
      },
    );
  });

  it("starts new stock at zero when a selected variant has no balance yet", () => {
    assert.deepEqual(
      buildStockCountInitialTarget({
        balance: null,
        product: productSummary(),
        variant: variantSummary(),
      }),
      {
        onHandQuantity: 0,
        productName: "Jasmine Rice",
        reservedQuantity: 0,
        sku: "RICE-5KG",
        variantName: "5kg bag",
      },
    );
  });

  it("filters archived variants out of the count picker", () => {
    assert.deepEqual(
      getActiveStockCountVariants([
        variantSummary({ sku: "RICE-5KG", status: "active" }),
        variantSummary({ sku: "RICE-OLD", status: "archived" }),
      ]).map((variant) => variant.sku),
      ["RICE-5KG"],
    );
  });
});

function productSummary(): AdminProductSummary {
  return {
    archivedAt: null,
    brandSlug: null,
    categorySlug: null,
    countryOfOrigin: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    description: null,
    features: [],
    isTaxable: true,
    name: "Jasmine Rice",
    priceIncludesTax: false,
    primaryImageUrl: null,
    slug: "jasmine-rice",
    status: "active",
    taxCategory: null,
    variantCount: 1,
  };
}

function variantSummary(
  overrides: Partial<AdminVariantSummary> = {},
): AdminVariantSummary {
  return {
    archivedAt: null,
    attributes: {},
    barcode: null,
    costPrice: "10.00",
    createdAt: "2026-01-01T00:00:00.000Z",
    customsCode: null,
    dimensionsCm: null,
    isDefault: true,
    manufacturerPartNumber: null,
    name: "5kg bag",
    packagingType: null,
    sellingPrice: "15.00",
    sku: "RICE-5KG",
    slug: "5kg-bag",
    status: "active",
    unitOfMeasure: "each",
    weightGrams: null,
    ...overrides,
  };
}

function stockBalance(
  overrides: Partial<
    Pick<
      AdminStockBalanceSummary,
      "availableQuantity" | "onHandQuantity" | "reservedQuantity"
    >
  > = {},
): AdminStockBalanceSummary {
  return {
    availableQuantity: 14,
    inTransitQuantity: 0,
    locationName: "Main Warehouse",
    locationSlug: "main-warehouse",
    onHandQuantity: 17,
    productName: "Jasmine Rice",
    productSlug: "jasmine-rice",
    reservedQuantity: 3,
    sku: "RICE-5KG",
    skuId: "22222222-2222-4222-8222-222222222222",
    updatedAt: "2026-01-01T00:00:00.000Z",
    variantName: "5kg bag",
    variantSlug: "5kg-bag",
    ...overrides,
  };
}
