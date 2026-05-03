import {
  catalogBrands,
  catalogCategories,
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
  productVariants,
} from "@shop/database";
import { inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogChangeEntityType } from "./catalog-change-log.types.js";

/**
 * Per-entity-type lookup of human-readable display names by id, used by
 * the change-log read repo to enrich each row with `entityName` /
 * `parentEntityName`. The display column differs by entity type:
 *
 * | entityType                     | column |
 * | ------------------------------ | ------ |
 * | catalog_brand                  | name   |
 * | catalog_category               | name   |
 * | catalog_product                | name   |
 * | product_variant                | name   |
 * | catalog_product_option         | name   |
 * | catalog_product_option_value   | value  |
 *
 * For options and option-values the name often equals the entity ref
 * after PR #88; the loader still returns it honestly so callers can
 * decide whether to collapse the rendering — fields stay independent.
 *
 * Empty `ids` short-circuits without a query, mirroring listPrimaryImageUrls.
 */
export async function loadEntityNames(
  db: ApiDatabase,
  entityType: CatalogChangeEntityType,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const rows = await selectRows(db, entityType, uniqueIds);
  return new Map(rows.map((row) => [row.id, row.name]));
}

async function selectRows(
  db: ApiDatabase,
  entityType: CatalogChangeEntityType,
  ids: readonly string[],
): Promise<Array<{ id: string; name: string }>> {
  switch (entityType) {
    case "catalog_brand":
      return db
        .select({ id: catalogBrands.id, name: catalogBrands.name })
        .from(catalogBrands)
        .where(inArray(catalogBrands.id, ids as string[]));
    case "catalog_category":
      return db
        .select({ id: catalogCategories.id, name: catalogCategories.name })
        .from(catalogCategories)
        .where(inArray(catalogCategories.id, ids as string[]));
    case "catalog_product":
      return db
        .select({ id: catalogProducts.id, name: catalogProducts.name })
        .from(catalogProducts)
        .where(inArray(catalogProducts.id, ids as string[]));
    case "product_variant":
      return db
        .select({ id: productVariants.id, name: productVariants.name })
        .from(productVariants)
        .where(inArray(productVariants.id, ids as string[]));
    case "catalog_product_option":
      return db
        .select({
          id: catalogProductOptions.id,
          name: catalogProductOptions.name,
        })
        .from(catalogProductOptions)
        .where(inArray(catalogProductOptions.id, ids as string[]));
    case "catalog_product_option_value":
      return db
        .select({
          id: catalogProductOptionValues.id,
          name: catalogProductOptionValues.value,
        })
        .from(catalogProductOptionValues)
        .where(inArray(catalogProductOptionValues.id, ids as string[]));
  }
}
