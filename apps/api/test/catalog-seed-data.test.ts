import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogSeedBrands,
  catalogSeedCategories,
  catalogSeedProducts,
} from "../scripts/lib/catalog-seed-data.js";

describe("catalog seed data", () => {
  it("keeps product dependencies and identifiers consistent", () => {
    const categorySlugs = new Set(
      catalogSeedCategories.map((category) => category.slug),
    );
    const brandSlugs = new Set(catalogSeedBrands.map((brand) => brand.slug));
    const productSlugs = new Set<string>();
    const variantSkus = new Set<string>();
    const variantBarcodes = new Set<string>();

    for (const product of catalogSeedProducts) {
      assert.ok(categorySlugs.has(product.categorySlug));
      assert.ok(brandSlugs.has(product.brandSlug));
      assert.ok(!productSlugs.has(product.slug));
      productSlugs.add(product.slug);

      const optionNames = new Set(product.options.map((option) => option.name));
      const defaultCount = product.variants.filter(
        (variant) => variant.isDefault,
      ).length;
      assert.equal(defaultCount, 1);

      for (const variant of product.variants) {
        assert.ok(!variantSkus.has(variant.sku));
        assert.ok(!variantBarcodes.has(variant.barcode));
        variantSkus.add(variant.sku);
        variantBarcodes.add(variant.barcode);

        const attributeNames = Object.keys(variant.attributes);
        assert.deepEqual(new Set(attributeNames), optionNames);
        for (const [name, value] of Object.entries(variant.attributes)) {
          const option = product.options.find((entry) => entry.name === name);
          assert.ok(option);
          assert.ok(option.values.includes(value));
        }
      }
    }
  });
});
