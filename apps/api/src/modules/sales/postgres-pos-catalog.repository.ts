import { catalogProducts, productVariants } from "@shop/database";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { PosCatalogVariantRepository, VariantSaleDetails } from "./sales.contracts.js";

export class PostgresPosCatalogVariantRepository
  implements PosCatalogVariantRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getVariantsForSale(
    skuIds: string[],
  ): Promise<Map<string, VariantSaleDetails>> {
    if (skuIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        isTaxable: sql<boolean>`COALESCE(${productVariants.isTaxable}, ${catalogProducts.isTaxable})`,
        name: productVariants.name,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        sellingPrice: productVariants.sellingPrice,
        sku: productVariants.sku,
        slug: productVariants.slug,
        skuId: productVariants.id,
        taxCategory: sql<string | null>`COALESCE(${productVariants.taxCategory}, ${catalogProducts.taxCategory})`,
      })
      .from(productVariants)
      .innerJoin(catalogProducts, eq(productVariants.productId, catalogProducts.id))
      .where(
        and(
          inArray(productVariants.id, skuIds),
          eq(productVariants.status, "active"),
        ),
      );

    const map = new Map<string, VariantSaleDetails>();
    for (const row of rows) {
      map.set(row.skuId, {
        isTaxable: row.isTaxable,
        name: row.name,
        productName: row.productName,
        productSlug: row.productSlug,
        sellingPrice: row.sellingPrice,
        sku: row.sku,
        slug: row.slug,
        taxCategory: row.taxCategory,
      });
    }
    return map;
  }
}
