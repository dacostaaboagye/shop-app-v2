import type {
  AdminBrandListQuery,
  AdminBrandSummary,
  CatalogEntityStatus,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogBrandQueryRepository } from "./catalog-brand-query.service.js";
import {
  getPrimaryImageUrl,
  listPrimaryImageUrls,
} from "./catalog-primary-image.loader.js";

export class PostgresCatalogBrandQueryRepository
  implements CatalogBrandQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getBrand(slug: string): Promise<AdminBrandSummary | null> {
    const brand = await this.db.query.catalogBrands.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    });

    if (!brand) return null;

    const primaryImageUrl = await getPrimaryImageUrl(
      this.db,
      "brand",
      brand.slug,
    );

    return {
      slug: brand.slug,
      name: brand.name,
      description: brand.description,
      website: brand.website,
      status: brand.status,
      createdAt: brand.createdAt.toISOString(),
      primaryImageUrl,
    };
  }

  async listBrands(input: AdminBrandListQuery) {
    const { page, pageSize, q, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;

    const [totalCountResult, rows] = await Promise.all([
      this.db.query.catalogBrands.findMany({
        where: (r, { and, ilike, eq }) =>
          and(
            q.trim() ? ilike(r.name, `%${q.trim()}%`) : undefined,
            status !== "all"
              ? eq(r.status, status as CatalogEntityStatus)
              : undefined,
          ),
      }),
      this.db.query.catalogBrands.findMany({
        where: (r, { and, ilike, eq }) =>
          and(
            q.trim() ? ilike(r.name, `%${q.trim()}%`) : undefined,
            status !== "all"
              ? eq(r.status, status as CatalogEntityStatus)
              : undefined,
          ),
        orderBy: (r, { asc, desc }) => {
          const column = sort === "createdAt" ? r.createdAt : r.name;
          return [dir === "desc" ? desc(column) : asc(column), asc(r.id)];
        },
        limit: pageSize,
        offset: offset,
      }),
    ]);

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "brand",
      rows.map((brand) => brand.slug),
    );

    return {
      items: rows.map((brand) => ({
        slug: brand.slug,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        status: brand.status,
        createdAt: brand.createdAt.toISOString(),
        primaryImageUrl: primaryImageUrls.get(brand.slug) ?? null,
      })),
      totalCount: totalCountResult.length,
    };
  }
}
