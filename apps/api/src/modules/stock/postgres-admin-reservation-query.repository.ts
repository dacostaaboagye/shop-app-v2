import type {
  AdminReservationListQuery,
  AdminReservationSummary,
  LocationReservationQuery,
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
  listReservationsByLocationId(input: LocationReservationQuery): Promise<{
    items: AdminReservationSummary[];
    locationName: string | null;
  }>;
};

type ReservationLocation = { id: string; name: string; slug: string };

export class PostgresAdminReservationQueryRepository
  implements AdminReservationQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async listReservations(input: AdminReservationListQuery) {
    const { brandSlug, categorySlug, locationSlug, limit, q } = input;
    const location = locationSlug
      ? await this.findLocationBySlug(locationSlug)
      : null;
    if (locationSlug && !location) {
      return { items: [], locationName: null };
    }
    return this.listReservationsForScope({
      brandSlug,
      categorySlug,
      limit,
      location,
      q,
    });
  }

  async listReservationsByLocationId(input: LocationReservationQuery) {
    const location = await this.findLocationById(input.locationId);
    if (!location) {
      return { items: [], locationName: null };
    }
    return this.listReservationsForScope({
      brandSlug: "",
      categorySlug: "",
      limit: input.limit,
      location,
      q: input.q,
    });
  }

  private async listReservationsForScope(input: {
    brandSlug: string;
    categorySlug: string;
    limit: number;
    location: ReservationLocation | null;
    q: string;
  }) {
    const { brandSlug, categorySlug, limit, location, q } = input;
    const hasQuery = q.trim().length > 0;
    const pattern = `%${q.trim()}%`;

    const filter = and(
      eq(stockReservations.status, "active"),
      location ? eq(stockReservations.locationId, location.id) : undefined,
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
      locationName: location?.name ?? null,
    };
  }

  private async findLocationById(
    id: string,
  ): Promise<ReservationLocation | null> {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.id, id))
      .limit(1);

    return location ?? null;
  }

  private async findLocationBySlug(
    slug: string,
  ): Promise<ReservationLocation | null> {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.slug, slug))
      .limit(1);

    return location ?? null;
  }
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
