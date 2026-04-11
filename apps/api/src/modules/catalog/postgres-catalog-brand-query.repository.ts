import type { AdminBrandListQuery, AdminBrandSummary } from "@shop/contracts";
import type { Pool } from "pg";
import type { CatalogBrandQueryRepository } from "./catalog-brand-query.service.js";

type BrandRow = Omit<AdminBrandSummary, "createdAt" | "primaryImageUrl"> & {
  createdAt: Date;
  primaryImageUrl: string | null;
};

const MEDIA_JOIN = `
  LEFT JOIN catalog_media_assignments cma_img
    ON cma_img.entity_type = 'brand'
    AND cma_img.entity_slug = b.slug
    AND cma_img.is_primary = true
  LEFT JOIN media_assets ma_img ON ma_img.id = cma_img.asset_id
`;

export class PostgresCatalogBrandQueryRepository
  implements CatalogBrandQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getBrand(slug: string): Promise<AdminBrandSummary | null> {
    const result = await this.pool.query<BrandRow>(
      `
        SELECT
          b.slug,
          b.name,
          b.description,
          b.website,
          b.status,
          b.created_at AS "createdAt",
          ma_img.public_url AS "primaryImageUrl"
        FROM catalog_brands b
        ${MEDIA_JOIN}
        WHERE b.slug = $1
      `,
      [slug],
    );

    const row = result.rows[0];
    if (!row) return null;
    return toBrand(row);
  }

  async listBrands(input: AdminBrandListQuery) {
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
        FROM catalog_brands b
        WHERE ($1::boolean = false OR b.name ILIKE $2)
          AND ($3::boolean = false OR b.status = $4)
      `,
      filterValues,
    );

    const result = await this.pool.query<BrandRow>(
      `
        SELECT
          b.slug,
          b.name,
          b.description,
          b.website,
          b.status,
          b.created_at AS "createdAt",
          ma_img.public_url AS "primaryImageUrl"
        FROM catalog_brands b
        ${MEDIA_JOIN}
        WHERE ($1::boolean = false OR b.name ILIKE $2)
          AND ($3::boolean = false OR b.status = $4)
        ORDER BY ${getBrandSortClause(input)}
        LIMIT $5 OFFSET $6
      `,
      [...filterValues, input.pageSize, offset],
    );

    return {
      items: result.rows.map(toBrand),
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }
}

function toBrand(row: BrandRow): AdminBrandSummary {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    primaryImageUrl: row.primaryImageUrl,
  };
}

function getBrandSortClause(input: AdminBrandListQuery): string {
  const direction = input.dir === "desc" ? "DESC" : "ASC";

  switch (input.sort) {
    case "createdAt":
      return `b.created_at ${direction}, b.id ASC`;
    case "status":
      return `b.status ${direction}, b.name ASC`;
    default:
      return `b.name ${direction}, b.id ASC`;
  }
}
