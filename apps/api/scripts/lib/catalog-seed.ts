import type { PoolClient } from "@neondatabase/serverless";
import {
  catalogSeedBrands,
  catalogSeedCategories,
  catalogSeedProducts,
} from "./catalog-seed-data.js";
import {
  upsertBrand,
  upsertCategory,
  upsertProduct,
  upsertProductOptions,
  upsertVariants,
} from "./catalog-seed-persistence.js";

export async function seedCatalog(client: PoolClient, now: Date): Promise<void> {
  const categoryIds = new Map<string, string>();
  const brandIds = new Map<string, string>();

  for (const category of catalogSeedCategories) {
    const categoryId = await upsertCategory(client, category, now);
    categoryIds.set(category.slug, categoryId);
  }

  for (const brand of catalogSeedBrands) {
    const brandId = await upsertBrand(client, brand, now);
    brandIds.set(brand.slug, brandId);
  }

  for (const product of catalogSeedProducts) {
    const categoryId = categoryIds.get(product.categorySlug);
    const brandId = brandIds.get(product.brandSlug);

    if (!categoryId || !brandId) {
      throw new Error(`Missing seed dependency for product "${product.slug}".`);
    }

    const productId = await upsertProduct(client, product, categoryId, brandId, now);
    await upsertProductOptions(client, productId, product.options, now);
    await upsertVariants(client, productId, product.variants, now);
  }
}
