import type {
  AdminReservationListQuery,
  AdminReservationSummary,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  locations,
  productVariants,
  stockReservations,
} from "@shop/database";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type AdminReservationQueryRepository = {
  listReservations(input: AdminReservationListQuery): Promise<{
    items: AdminReservationSummary[];
    locationName: string | null;
  }>;
};

export class PostgresAdminReservationQueryRepository
  implements AdminReservationQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listReservations(input: AdminReservationListQuery) {
    const { brandSlug, categorySlug, locationSlug, limit, q } = input;
    const hasQuery = q.trim().length > 0;
    const pattern = `%${q.trim()}%`;

    const filter = and(
      eq(stockReservations.status, "active"),
      locationSlug ? eq(locations.slug, locationSlug) : undefined,
      hasQuery
        ? or(
            ilike(productVariants.sku, pattern),
            ilike(catalogProducts.name, pattern),
            ilike(productVariants.name, pattern),
          )
        : undefined,
      brandSlug ? eq(catalogBrands.slug, brandSlug) : undefined,
      categorySlug ? eq(catalogCategories.slug, categorySlug) : undefined,
    );

    const rows = await this.db
      .select({
        createdAt: stockReservations.createdAt,
        expiresAt: stockReservations.expiresAt,
        locationName: locations.name,
        locationSlug: locations.slug,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        quantity: stockReservations.quantity,
        sku: productVariants.sku,
        skuId: productVariants.id,
        sourceKey: stockReservations.sourceKey,
        sourceType: stockReservations.sourceType,
        status: stockReservations.status,
        updatedAt: stockReservations.updatedAt,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
      })
      .from(stockReservations)
      .innerJoin(
        productVariants,
        eq(productVariants.id, stockReservations.skuId),
      )
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
      .leftJoin(
        catalogCategories,
        eq(catalogCategories.id, catalogProducts.categoryId),
      )
      .innerJoin(locations, eq(locations.id, stockReservations.locationId))
      .where(filter)
      .orderBy(
        asc(stockReservations.expiresAt),
        asc(stockReservations.createdAt),
      )
      .limit(limit);

    return {
      items: rows.map((row) => ({
        ...row,
        status: "active" as const,
        createdAt: toIsoTimestamp(row.createdAt),
        expiresAt: row.expiresAt ? toIsoTimestamp(row.expiresAt) : null,
        updatedAt: toIsoTimestamp(row.updatedAt),
      })),
      locationName: locationSlug ? (rows[0]?.locationName ?? null) : null,
    };
  }
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
