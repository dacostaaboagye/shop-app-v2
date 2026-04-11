import type {
  AdminProductDetail,
  AdminProductListQuery,
  AdminProductOption,
  AdminProductSummary,
  AdminVariantSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { CatalogProductQueryRepository } from "./catalog-product-query.service.js";

type ProductSummaryRow = Omit<
  AdminProductSummary,
  "archivedAt" | "createdAt" | "primaryImageUrl"
> & {
  archivedAt: Date | null;
  createdAt: Date;
  primaryImageUrl: string | null;
};

type VariantRow = Omit<
  AdminVariantSummary,
  "archivedAt" | "createdAt" | "attributes" | "dimensionsCm"
> & {
  archivedAt: Date | null;
  attributes: Record<string, string>;
  createdAt: Date;
  dimensionsCm: { height?: number; length?: number; width?: number } | null;
};

const PRODUCT_SELECT = `
  p.slug,
  p.name,
  p.description,
  p.features,
  c.slug AS "categorySlug",
  b.slug AS "brandSlug",
  p.country_of_origin AS "countryOfOrigin",
  p.is_taxable AS "isTaxable",
  p.tax_category AS "taxCategory",
  p.price_includes_tax AS "priceIncludesTax",
  p.status,
  COUNT(v.id)::int AS "variantCount",
  p.created_at AS "createdAt",
  p.archived_at AS "archivedAt",
  ma_img.public_url AS "primaryImageUrl"
`;

const PRODUCT_JOINS = `
  LEFT JOIN catalog_categories c ON c.id = p.category_id
  LEFT JOIN catalog_brands b ON b.id = p.brand_id
  LEFT JOIN product_variants v ON v.product_id = p.id
  LEFT JOIN catalog_media_assignments cma_img
    ON cma_img.entity_type = 'product'
    AND cma_img.entity_slug = p.slug
    AND cma_img.is_primary = true
  LEFT JOIN media_assets ma_img ON ma_img.id = cma_img.asset_id
`;

export class PostgresCatalogProductQueryRepository
  implements CatalogProductQueryRepository
{
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async getProduct(slug: string): Promise<AdminProductDetail | null> {
    const productResult = await this.pool.query<ProductSummaryRow>(
      `
        SELECT ${PRODUCT_SELECT}
        FROM catalog_products p
        ${PRODUCT_JOINS}
        WHERE p.slug = $1
        GROUP BY p.id, c.slug, b.slug, ma_img.public_url
      `,
      [slug],
    );

    const product = productResult.rows[0];
    if (!product) return null;

    const variantResult = await this.pool.query<VariantRow>(
      `
        SELECT
          v.slug,
          v.name,
          v.sku,
          v.barcode,
          v.unit_of_measure AS "unitOfMeasure",
          v.cost_price AS "costPrice",
          v.selling_price AS "sellingPrice",
          v.attributes,
          v.weight_grams AS "weightGrams",
          v.dimensions_cm AS "dimensionsCm",
          v.packaging_type AS "packagingType",
          v.manufacturer_part_number AS "manufacturerPartNumber",
          v.customs_code AS "customsCode",
          v.is_default AS "isDefault",
          v.status,
          v.created_at AS "createdAt",
          v.archived_at AS "archivedAt"
        FROM product_variants v
        JOIN catalog_products p ON p.id = v.product_id
        WHERE p.slug = $1
        ORDER BY v.is_default DESC, v.created_at ASC
      `,
      [slug],
    );

    const optionResult = await this.pool.query<{
      id: string;
      name: string;
      position: number;
      valueId: string;
      value: string;
      valuePosition: number;
    }>(
      `
        SELECT
          o.id, o.name, o.position,
          ov.id AS "valueId", ov.value, ov.position AS "valuePosition"
        FROM catalog_product_options o
        LEFT JOIN catalog_product_option_values ov ON ov.option_id = o.id
        WHERE o.product_id = (SELECT id FROM catalog_products WHERE slug = $1)
        ORDER BY o.position ASC, o.id ASC, ov.position ASC, ov.id ASC
      `,
      [slug],
    );

    return {
      ...toProductSummary(product),
      options: toProductOptions(optionResult.rows),
      variants: variantResult.rows.map(toVariantSummary),
    };
  }

  async listProducts(input: AdminProductListQuery) {
    const query = input.q.trim();
    const offset = (input.page - 1) * input.pageSize;
    const filterValues = [
      query.length > 0,
      `%${query}%`,
      input.status !== "all",
      input.status === "all" ? null : input.status,
      input.categorySlug.length > 0,
      input.categorySlug || null,
      input.brandSlug.length > 0,
      input.brandSlug || null,
    ];

    const countResult = await this.pool.query<{ count: string }>(
      `
        SELECT COUNT(DISTINCT p.id)::text AS count
        FROM catalog_products p
        LEFT JOIN catalog_categories c ON c.id = p.category_id
        LEFT JOIN catalog_brands b ON b.id = p.brand_id
        WHERE ($1::boolean = false OR CONCAT_WS(' ', p.name, p.slug) ILIKE $2)
          AND ($3::boolean = false OR p.status = $4)
          AND ($5::boolean = false OR c.slug = $6)
          AND ($7::boolean = false OR b.slug = $8)
      `,
      filterValues,
    );

    const result = await this.pool.query<ProductSummaryRow>(
      `
        SELECT ${PRODUCT_SELECT}
        FROM catalog_products p
        ${PRODUCT_JOINS}
        WHERE ($1::boolean = false OR CONCAT_WS(' ', p.name, p.slug) ILIKE $2)
          AND ($3::boolean = false OR p.status = $4)
          AND ($5::boolean = false OR c.slug = $6)
          AND ($7::boolean = false OR b.slug = $8)
        GROUP BY p.id, c.slug, b.slug, ma_img.public_url
        ORDER BY ${getProductSortClause(input)}
        LIMIT $9 OFFSET $10
      `,
      [...filterValues, input.pageSize, offset],
    );

    return {
      items: result.rows.map(toProductSummary),
      totalCount: Number.parseInt(countResult.rows[0]?.count ?? "0", 10),
    };
  }
}

function toProductSummary(row: ProductSummaryRow): AdminProductSummary {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    features: (row.features as string[]) ?? [],
    primaryImageUrl: row.primaryImageUrl,
  };
}

function toProductOptions(
  rows: {
    id: string;
    name: string;
    position: number;
    valueId: string | null;
    value: string | null;
    valuePosition: number | null;
  }[],
): AdminProductOption[] {
  const map = new Map<string, AdminProductOption>();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        optionId: row.id,
        name: row.name,
        position: row.position,
        values: [],
      });
    }
    if (row.valueId && row.value !== null) {
      map.get(row.id)?.values.push({
        valueId: row.valueId,
        position: row.valuePosition ?? 0,
        value: row.value,
      });
    }
  }
  return [...map.values()];
}

function toVariantSummary(row: VariantRow): AdminVariantSummary {
  return {
    ...row,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function getProductSortClause(input: AdminProductListQuery): string {
  const direction = input.dir === "desc" ? "DESC" : "ASC";

  switch (input.sort) {
    case "createdAt":
      return `p.created_at ${direction}, p.id ASC`;
    case "status":
      return `p.status ${direction}, p.name ASC`;
    default:
      return `p.name ${direction}, p.id ASC`;
  }
}
