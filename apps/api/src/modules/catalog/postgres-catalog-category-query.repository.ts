import type {
  AdminCategoryListQuery,
  AdminCategorySummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { CatalogCategoryQueryRepository } from "./catalog-category-query.service.js";

type CategoryRow = Omit<
  AdminCategorySummary,
  "createdAt" | "primaryImageUrl"
> & {
  createdAt: Date;
  primaryImageUrl: string | null;
};

const MEDIA_JOIN = `
  LEFT JOIN catalog_media_assignments cma_img
    ON cma_img.entity_type = 'category'
    AND cma_img.entity_slug = c.slug
    AND cma_img.is_primary = true
  LEFT JOIN media_assets ma_img ON ma_img.id = cma_img.asset_id
`;

export class PostgresCatalogCategoryQueryRepository
  implements CatalogCategoryQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getCategory(slug: string): Promise<AdminCategorySummary | null> {
    const result = await this.pool.query<CategoryRow>(
      `
        SELECT
          c.slug,
          c.name,
          c.description,
          parent.slug AS "parentCategorySlug",
          c.status,
          c.created_at AS "createdAt",
          ma_img.public_url AS "primaryImageUrl"
        FROM catalog_categories c
        LEFT JOIN catalog_categories parent ON parent.id = c.parent_category_id
        ${MEDIA_JOIN}
        WHERE c.slug = $1
      `,
      [slug],
    );

    const row = result.rows[0];
    if (!row) return null;
    return toCategory(row);
  }

  async listCategories(input: AdminCategoryListQuery) {
    const query = input.q.trim();
    const offset = (input.page - 1) * input.pageSize;
    const filterValues = [
      query.length > 0,
      `%${query}%`,
      input.status !== "all",
      input.status === "all" ? null : input.status,
    ];

    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM catalog_categories c
        WHERE ($1::boolean = false OR c.name ILIKE $2)
          AND ($3::boolean = false OR c.status = $4)
      `,
      filterValues,
    );

    const result = await this.pool.query<CategoryRow>(
      `
        SELECT
          c.slug,
          c.name,
          c.description,
          parent.slug AS "parentCategorySlug",
          c.status,
          c.created_at AS "createdAt",
          ma_img.public_url AS "primaryImageUrl"
        FROM catalog_categories c
        LEFT JOIN catalog_categories parent ON parent.id = c.parent_category_id
        ${MEDIA_JOIN}
        WHERE ($1::boolean = false OR c.name ILIKE $2)
          AND ($3::boolean = false OR c.status = $4)
        ORDER BY ${getCategorySortClause(input)}
        LIMIT $5 OFFSET $6
      `,
      [...filterValues, input.pageSize, offset],
    );

    return {
      items: result.rows.map(toCategory),
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }
}

function toCategory(row: CategoryRow): AdminCategorySummary {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    primaryImageUrl: row.primaryImageUrl,
  };
}

function getCategorySortClause(input: AdminCategoryListQuery): string {
  const direction = input.dir === "desc" ? "DESC" : "ASC";

  switch (input.sort) {
    case "createdAt":
      return `c.created_at ${direction}, c.id ASC`;
    case "status":
      return `c.status ${direction}, c.name ASC`;
    default:
      return `c.name ${direction}, c.id ASC`;
  }
}
