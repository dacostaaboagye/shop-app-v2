import type {
  AdminStockBalanceListQuery,
  AdminStockBalanceSummary,
  LocationStockBalanceQuery,
} from "@shop/contracts";
import {
  catalogProducts,
  locations,
  productVariants,
  stockBalances,
} from "@shop/database";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type StockBalanceQueryRepository = {
  listStockBalances(input: AdminStockBalanceListQuery): Promise<{
    items: AdminStockBalanceSummary[];
    locationName: string | null;
    totalCount: number;
  }>;
  listStockBalancesByLocationId(input: LocationStockBalanceQuery): Promise<{
    items: AdminStockBalanceSummary[];
    locationName: string | null;
    totalCount: number;
  }>;
};

export class PostgresStockBalanceQueryRepository
  implements StockBalanceQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listStockBalances(input: AdminStockBalanceListQuery) {
    const { locationSlug, page, pageSize, q } = input;
    const hasQuery = q.trim().length > 0;
    const pattern = `%${q.trim()}%`;
    const offset = (page - 1) * pageSize;

    const filter = and(
      eq(locations.slug, locationSlug),
      hasQuery
        ? or(
            ilike(catalogProducts.name, pattern),
            ilike(productVariants.name, pattern),
            ilike(productVariants.sku, pattern),
          )
        : undefined,
    );

    const [countResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockBalances)
      .innerJoin(productVariants, eq(productVariants.id, stockBalances.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockBalances.locationId))
      .where(filter);

    const rows = await this.db
      .select({
        skuId: productVariants.id,
        sku: productVariants.sku,
        variantSlug: productVariants.slug,
        variantName: productVariants.name,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        locationName: locations.name,
        locationSlug: locations.slug,
        onHandQuantity: stockBalances.onHandQuantity,
        reservedQuantity: stockBalances.reservedQuantity,
        updatedAt: stockBalances.updatedAt,
      })
      .from(stockBalances)
      .innerJoin(productVariants, eq(productVariants.id, stockBalances.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockBalances.locationId))
      .where(filter)
      .orderBy(asc(catalogProducts.name), asc(productVariants.name))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) => ({
        ...row,
        availableQuantity: row.onHandQuantity - row.reservedQuantity,
        updatedAt: row.updatedAt.toISOString(),
      })),
      locationName: rows[0]?.locationName ?? null,
      totalCount: countResult?.count ?? 0,
    };
  }

  async listStockBalancesByLocationId(input: LocationStockBalanceQuery) {
    const { locationId, page, pageSize, q } = input;
    const hasQuery = q.trim().length > 0;
    const pattern = `%${q.trim()}%`;
    const offset = (page - 1) * pageSize;

    const filter = and(
      eq(locations.id, locationId),
      hasQuery
        ? or(
            ilike(catalogProducts.name, pattern),
            ilike(productVariants.name, pattern),
            ilike(productVariants.sku, pattern),
          )
        : undefined,
    );

    const [countResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockBalances)
      .innerJoin(productVariants, eq(productVariants.id, stockBalances.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockBalances.locationId))
      .where(filter);

    const rows = await this.db
      .select({
        skuId: productVariants.id,
        sku: productVariants.sku,
        variantSlug: productVariants.slug,
        variantName: productVariants.name,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        locationName: locations.name,
        locationSlug: locations.slug,
        onHandQuantity: stockBalances.onHandQuantity,
        reservedQuantity: stockBalances.reservedQuantity,
        updatedAt: stockBalances.updatedAt,
      })
      .from(stockBalances)
      .innerJoin(productVariants, eq(productVariants.id, stockBalances.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockBalances.locationId))
      .where(filter)
      .orderBy(asc(catalogProducts.name), asc(productVariants.name))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((row) => ({
        ...row,
        availableQuantity: row.onHandQuantity - row.reservedQuantity,
        updatedAt: row.updatedAt.toISOString(),
      })),
      locationName: rows[0]?.locationName ?? null,
      totalCount: countResult?.count ?? 0,
    };
  }
}
