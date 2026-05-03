import type { VariantSearchResult } from @shop/contracts;
import {
  catalogProducts,
  locations,
  productVariants,
  stockBalances,
} from @shop/database;
import { and, asc, eq, gt, ilike, or, sql } from drizzle-orm;
import type { ApiDatabase } from ../../infrastructure/database.js;
import { listPrimaryImageUrls } from ./catalog-primary-image.loader.js;

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

    // Use stock_balances as the base â€” only variants that physically exist at this location
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
      product,
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

  async searchOpeningVariantsByLocationSlug(input: {
    locationSlug: string;
    page: number;
    pageSize: number;
    q: string;
  }): Promise<{ items: VariantSearchResult[]; total: number }> {
    const [location] = await this.db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.slug, input.locationSlug))
      .limit(1);

    if (!location) {
      return { items: [], total: 0 };
    }

    return this.searchOpeningVariants({
      locationId: location.id,
      page: input.page,
      pageSize: input.pageSize,
      q: input.q,
    });
  }

  async searchOpeningVariants(input: {
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
            ilike(productVariants.barcode, `%${searchTerm}%`),
          )
        : undefined;

    const activeCatalogCondition = and(
      eq(catalogProducts.status, active),
      eq(productVariants.status, active),
      searchFilter,
    );

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(productVariants)
        .innerJoin(
          catalogProducts,
          eq(productVariants.productId, catalogProducts.id),
        )
        .where(activeCatalogCondition),
      this.db
        .select({
          name: productVariants.name,
          onHandQuantity: sql<number>`coalesce(${stockBalances.onHandQuantity}, 0)::int`,
          openingStockStatus: sql<
            VariantSearchResult[openingStockStatus]
          >`case when ${stockBalances.id} is not null then 'initialized' else 'available' end`,
          productName: catalogProducts.name,
          productSlug: catalogProducts.slug,
          sellingPrice: productVariants.sellingPrice,
          sku: productVariants.sku,
          variantId: productVariants.id,
        })
        .from(productVariants)
        .innerJoin(
          catalogProducts,
          eq(productVariants.productId, catalogProducts.id),
        )
        .leftJoin(
          stockBalances,
          and(
            eq(stockBalances.skuId, productVariants.id),
            eq(stockBalances.locationId, input.locationId),
          ),
        )
        .where(activeCatalogCondition)
        .orderBy(asc(catalogProducts.name), asc(productVariants.name))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
    ]);

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      product,
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
