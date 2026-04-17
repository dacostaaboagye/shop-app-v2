import { catalogSeedProductsA } from "./catalog-seed-products-a.js";
import { catalogSeedProductsB } from "./catalog-seed-products-b.js";
import { catalogSeedBrands, catalogSeedCategories } from "./catalog-seed-taxonomy.js";

export { catalogSeedBrands, catalogSeedCategories } from "./catalog-seed-taxonomy.js";
export type {
  SeedBrand,
  SeedCategory,
  SeedOption,
  SeedProduct,
  SeedVariant,
} from "./catalog-seed-types.js";

export const catalogSeedProducts = [...catalogSeedProductsA, ...catalogSeedProductsB];

