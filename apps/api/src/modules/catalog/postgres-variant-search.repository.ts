import type { VariantSearchResult } from "@shop/contracts";
import {
  catalogProducts,
  productVariants,
  stockBalances,
} from "@shop/database";
import { and, asc, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "./catalog-primary-image.loader.js";

export class PostgresVariantSearchRepository {
  constructor(private readonly db: ApiDatabase) {}

  async searchVariants(input: {
    locationId: string;
    page: number;
    pageSize: number;
    q: string;
  }): Promise<{ items: VariantSearchResult[]; total: number }> {
    const searchTerm = input.q.trim();

    const searchFilter =
      searchTerm.length > 0
        ? or(
            ilike(catalogProducts.name, `%${searchTerm}%`),
            ilike(productVariants.name, `%${searchTerm}%`),
            ilike(productVariants.sku, `%${searchTerm}%`),
          )
        : undefined;

    // Use stock_balances as the base — only variants that physically exist at this location
    const baseCondition = and(
      eq(stockBalances.locationId, input.locationId),
      gt(stockBalances.onHandQuantity, 0),
      searchFilter,
    );

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(stockBalances)
        .innerJoin(productVariants, eq(stockBalances.skuId, productVariants.id))
        .innerJoin(
          catalogProducts,
          eq(productVariants.productId, catalogProducts.id),
        )
        .where(baseCondition),
      this.db
        .select({
          name: productVariants.name,
          onHandQuantity: stockBalances.onHandQuantity,
          productName: catalogProducts.name,
          productSlug: catalogProducts.slug,
          sellingPrice: productVariants.sellingPrice,
          sku: productVariants.sku,
          variantId: productVariants.id,
        })
        .from(stockBalances)
        .innerJoin(productVariants, eq(stockBalances.skuId, productVariants.id))
        .innerJoin(
          catalogProducts,
          eq(productVariants.productId, catalogProducts.id),
        )
        .where(baseCondition)
        .orderBy(asc(catalogProducts.name), asc(productVariants.name))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
    ]);

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "product",
      rows.map((row) => row.productSlug),
    );

    return {
      items: rows.map((row) => ({
        ...row,
        primaryImageUrl: primaryImageUrls.get(row.productSlug) ?? null,
      })),
      total: countResult[0]?.count ?? 0,
    };
  }
}
