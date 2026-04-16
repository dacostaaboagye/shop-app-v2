import type {
  AdminReservationListQuery,
  AdminReservationSummary,
} from "@shop/contracts";
import {
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
    const { locationSlug, limit, q } = input;
    const hasQuery = q.trim().length > 0;
    const pattern = `%${q.trim()}%`;

    const filter = and(
      eq(stockReservations.status, "active"),
      eq(locations.slug, locationSlug),
      hasQuery
        ? or(
            ilike(productVariants.sku, pattern),
            ilike(catalogProducts.name, pattern),
            ilike(productVariants.name, pattern),
          )
        : undefined,
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
      .innerJoin(productVariants, eq(productVariants.id, stockReservations.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockReservations.locationId))
      .where(filter)
      .orderBy(asc(stockReservations.expiresAt), asc(stockReservations.createdAt))
      .limit(limit);

    return {
      items: rows.map((row) => ({
        ...row,
        status: "active" as const,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      locationName: rows[0]?.locationName ?? null,
    };
  }
}
