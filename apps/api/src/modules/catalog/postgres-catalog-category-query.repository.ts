import type {
  AdminCategoryListQuery,
  AdminCategorySummary,
  CatalogEntityStatus,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogCategoryQueryRepository } from "./catalog-category-query.service.js";
import {
  getPrimaryImageUrl,
  listPrimaryImageUrls,
} from "./catalog-primary-image.loader.js";

export class PostgresCatalogCategoryQueryRepository
  implements CatalogCategoryQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getCategory(slug: string): Promise<AdminCategorySummary | null> {
    const category = await this.db.query.catalogCategories.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
      with: {
        parentCategory: {
          columns: { slug: true, name: true },
        },
      },
    });

    if (!category) return null;

    const primaryImageUrl = await getPrimaryImageUrl(
      this.db,
      "category",
      category.slug,
    );

    return {
      slug: category.slug,
      name: category.name,
      description: category.description,
      parentCategorySlug: category.parentCategory?.slug ?? null,
      status: category.status,
      createdAt: category.createdAt.toISOString(),
      primaryImageUrl,
    };
  }

  async listCategories(input: AdminCategoryListQuery) {
    const { page, pageSize, q, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;

    const [totalCountResult, rows] = await Promise.all([
      this.db.query.catalogCategories.findMany({
        where: (r, { and, ilike, eq }) =>
          and(
            q.trim() ? ilike(r.name, `%${q.trim()}%`) : undefined,
            status !== "all"
              ? eq(r.status, status as CatalogEntityStatus)
              : undefined,
          ),
      }),
      this.db.query.catalogCategories.findMany({
        where: (r, { and, ilike, eq }) =>
          and(
            q.trim() ? ilike(r.name, `%${q.trim()}%`) : undefined,
            status !== "all"
              ? eq(r.status, status as CatalogEntityStatus)
              : undefined,
          ),
        with: {
          parentCategory: {
            columns: { slug: true, name: true },
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

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "category",
      rows.map((category) => category.slug),
    );

    return {
      items: rows.map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentCategorySlug: category.parentCategory?.slug ?? null,
        status: category.status,
        createdAt: category.createdAt.toISOString(),
        primaryImageUrl: primaryImageUrls.get(category.slug) ?? null,
      })),
      totalCount: totalCountResult.length,
    };
  }
}
