import {
  AdminBrandListQuery,
  AdminBrandSummary,
  CatalogEntityStatus,
} from "@shop/contracts";
import { catalogBrands } from "@shop/database";
import { and, asc, desc, ilike } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogBrandQueryRepository } from "./catalog-brand-query.service.js";

export class PostgresCatalogBrandQueryRepository
  implements CatalogBrandQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getBrand(slug: string): Promise<AdminBrandSummary | null> {
    const brand = await this.db.query.catalogBrands.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
      with: {
        mediaAssignments: {
          where: (ma, { and, eq }) =>
            and(eq(ma.entityType, "brand"), eq(ma.isPrimary, true)),
          with: {
            asset: true,
          },
        },
      },
    });

    if (!brand) return null;

    return {
      slug: brand.slug,
      name: brand.name,
      description: brand.description,
      website: brand.website,
      status: brand.status,
      createdAt: brand.createdAt.toISOString(),
      primaryImageUrl: brand.mediaAssignments[0]?.asset?.publicUrl ?? null,
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
            status !== "all" ? eq(r.status, status as CatalogEntityStatus) : undefined,
          ),
      }),
      this.db.query.catalogBrands.findMany({
        where: (r, { and, ilike, eq }) =>
          and(
            q.trim() ? ilike(r.name, `%${q.trim()}%`) : undefined,
            status !== "all" ? eq(r.status, status as CatalogEntityStatus) : undefined,
          ),
        with: {
          mediaAssignments: {
            where: (ma, { and, eq }) =>
              and(eq(ma.entityType, "brand"), eq(ma.isPrimary, true)),
            with: {
              asset: true,
            },
          },
        },
        orderBy: (r, { asc, desc }) => {
          const column = sort === "createdAt" ? r.createdAt : r.name;
          return [dir === "desc" ? desc(column) : asc(column), asc(r.id)];
        },
        limit: pageSize,
        offset: offset,
      }),
    ]);

    return {
      items: rows.map((brand) => ({
        slug: brand.slug,
        name: brand.name,
        description: brand.description,
        website: brand.website,
        status: brand.status,
        createdAt: brand.createdAt.toISOString(),
        primaryImageUrl: brand.mediaAssignments[0]?.asset?.publicUrl ?? null,
      })),
      totalCount: totalCountResult.length,
    };
  }
}
