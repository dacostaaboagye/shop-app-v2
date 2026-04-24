import type {
  AdminStockBalanceListQuery,
  AdminStockBalanceSummary,
  LocationStockBalanceQuery,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  goodsTransferNotes,
  locations,
  productVariants,
  stockBalances,
} from "@shop/database";
import { and, asc, eq, ilike, isNotNull, or, type SQL, sql } from "drizzle-orm";
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

type StockLocation = { id: string; name: string; slug: string };

export class PostgresStockBalanceQueryRepository
  implements StockBalanceQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listStockBalances(input: AdminStockBalanceListQuery) {
    const location = input.locationSlug
      ? await this.findLocationBySlug(input.locationSlug)
      : null;
    if (input.locationSlug && !location) {
      return { items: [], locationName: null, totalCount: 0 };
    }
    return this.listStockBalancesForScope({
      brandSlug: input.brandSlug,
      categorySlug: input.categorySlug,
      location,
      page: input.page,
      pageSize: input.pageSize,
      q: input.q,
    });
  }

  async listStockBalancesByLocationId(input: LocationStockBalanceQuery) {
    const location = await this.findLocationById(input.locationId);
    if (!location) {
      return { items: [], locationName: null, totalCount: 0 };
    }
    return this.listStockBalancesForScope({
      brandSlug: "",
      categorySlug: "",
      location,
      page: input.page,
      pageSize: input.pageSize,
      q: input.q,
    });
  }

  private async listStockBalancesForScope(input: {
    brandSlug: string;
    categorySlug: string;
    location: StockLocation | null;
    page: number;
    pageSize: number;
    q: string;
  }) {
    const { brandSlug, categorySlug, location, page, pageSize, q } = input;
    const balances = this.balanceBySku(location?.id);
    const inTransit = this.inTransitBySku(location?.id);
    const hasQuery = q.trim().length > 0;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q.trim()}%`;
    const scopeName = location?.name ?? "All locations";
    const scopeSlug = location?.slug ?? "all-locations";

    const filter = and(
      or(isNotNull(balances.skuId), isNotNull(inTransit.skuId)),
      hasQuery
        ? or(
            ilike(catalogProducts.name, pattern),
            ilike(productVariants.name, pattern),
            ilike(productVariants.sku, pattern),
          )
        : undefined,
      brandSlug ? eq(catalogBrands.slug, brandSlug) : undefined,
      categorySlug ? eq(catalogCategories.slug, categorySlug) : undefined,
    );

    const [countResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(productVariants)
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
      .leftJoin(
        catalogCategories,
        eq(catalogCategories.id, catalogProducts.categoryId),
      )
      .leftJoin(balances, eq(balances.skuId, productVariants.id))
      .leftJoin(inTransit, eq(inTransit.skuId, productVariants.id))
      .where(filter);

    const rows = await this.db
      .select({
        availableQuantity: sql<number>`cast(coalesce(${balances.onHandQuantity}, 0) - coalesce(${balances.reservedQuantity}, 0) as int)`,
        inTransitQuantity: inTransit.inTransitQuantity,
        onHandQuantity: balances.onHandQuantity,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        reservedQuantity: balances.reservedQuantity,
        sku: productVariants.sku,
        skuId: productVariants.id,
        updatedAt: balances.latestUpdatedAt,
        inTransitUpdatedAt: inTransit.latestDispatchedAt,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
      })
      .from(productVariants)
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
      .leftJoin(
        catalogCategories,
        eq(catalogCategories.id, catalogProducts.categoryId),
      )
      .leftJoin(balances, eq(balances.skuId, productVariants.id))
      .leftJoin(inTransit, eq(inTransit.skuId, productVariants.id))
      .where(filter)
      .orderBy(asc(catalogProducts.name), asc(productVariants.name))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map(
        (row): AdminStockBalanceSummary => ({
          availableQuantity: row.availableQuantity,
          inTransitQuantity: row.inTransitQuantity ?? 0,
          locationName: scopeName,
          locationSlug: scopeSlug,
          onHandQuantity: row.onHandQuantity ?? 0,
          productName: row.productName,
          productSlug: row.productSlug,
          reservedQuantity: row.reservedQuantity ?? 0,
          sku: row.sku,
          skuId: row.skuId,
          updatedAt: toIsoTimestamp(row.updatedAt ?? row.inTransitUpdatedAt),
          variantName: row.variantName,
          variantSlug: row.variantSlug,
        }),
      ),
      locationName: location?.name ?? null,
      totalCount: countResult?.count ?? 0,
    };
  }

  private async findLocationById(id: string) {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);
    return location ?? null;
  }

  private async findLocationBySlug(slug: string) {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.slug, slug))
      .limit(1);
    return location ?? null;
  }

  private balanceBySku(locationId: string | undefined) {
    const locationFilter: SQL | undefined = locationId
      ? eq(stockBalances.locationId, locationId)
      : undefined;

    const query = this.db
      .select({
        latestUpdatedAt: sql<Date>`max(${stockBalances.updatedAt})`.as(
          "latest_updated_at",
        ),
        onHandQuantity:
          sql<number>`cast(coalesce(sum(${stockBalances.onHandQuantity}), 0) as int)`.as(
            "on_hand_quantity",
          ),
        reservedQuantity:
          sql<number>`cast(coalesce(sum(${stockBalances.reservedQuantity}), 0) as int)`.as(
            "reserved_quantity",
          ),
        skuId: stockBalances.skuId,
      })
      .from(stockBalances);

    const scopedQuery = locationFilter ? query.where(locationFilter) : query;

    return scopedQuery.groupBy(stockBalances.skuId).as("stock_balance_by_sku");
  }

  private inTransitBySku(locationId: string | undefined) {
    const destinationFilter: SQL | undefined = locationId
      ? eq(goodsTransferNotes.destinationLocationId, locationId)
      : undefined;

    return this.db
      .select({
        inTransitQuantity:
          sql<number>`cast(coalesce(sum(${goodsTransferNotes.quantity}), 0) as int)`.as(
            "in_transit_quantity",
          ),
        latestDispatchedAt:
          sql<Date>`max(${goodsTransferNotes.dispatchedAt})`.as(
            "latest_dispatched_at",
          ),
        skuId: goodsTransferNotes.skuId,
      })
      .from(goodsTransferNotes)
      .where(
        and(eq(goodsTransferNotes.status, "dispatched"), destinationFilter),
      )
      .groupBy(goodsTransferNotes.skuId)
      .as("stock_in_transit_by_sku");
  }
}

function toIsoTimestamp(value: Date | string | null | undefined) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value ?? 0).toISOString();
}
