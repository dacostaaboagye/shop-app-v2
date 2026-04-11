import type {
  AdminCreateProductRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { assertProductCanBeArchived } from "./postgres-catalog-product-archive-guard.js";
import {
  type ProductSummaryRow,
  resolveBrandId,
  resolveCategoryId,
  toProductSummary,
  toVariantSummary,
  VARIANT_RETURNING,
  type VariantRow,
} from "./postgres-catalog-product-write.support.js";

export type CatalogProductRepository = {
  createProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateProductRequest;
  }): Promise<AdminProductDetail>;
  updateProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateProductRequest;
    slug: string;
  }): Promise<AdminProductDetail | null>;
};

export class PostgresCatalogProductWriteRepository
  implements CatalogProductRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly slugAllocator: SlugAllocator,
  ) {}

  async createProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateProductRequest;
  }) {
    const categoryId = await resolveCategoryId(
      this.pool,
      input.payload.categorySlug ?? null,
    );
    const brandId = await resolveBrandId(
      this.pool,
      input.payload.brandSlug ?? null,
    );
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "catalog_product",
      value: input.payload.name,
    });

    const result = await this.pool.query<ProductSummaryRow>(
      `
        WITH inserted AS (
          INSERT INTO catalog_products (
            slug, name, description, category_id, brand_id,
            country_of_origin, is_taxable, tax_category, price_includes_tax,
            status, created_by, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
          RETURNING
            id, slug, name, description, features, category_id, brand_id,
            country_of_origin, is_taxable, tax_category, price_includes_tax,
            status, created_at, archived_at
        )
        SELECT
          i.slug, i.name, i.description, i.features,
          c.slug AS "categorySlug",
          b.slug AS "brandSlug",
          i.country_of_origin AS "countryOfOrigin",
          i.is_taxable AS "isTaxable",
          i.tax_category AS "taxCategory",
          i.price_includes_tax AS "priceIncludesTax",
          i.status, 0::int AS "variantCount",
          i.created_at AS "createdAt",
          i.archived_at AS "archivedAt"
        FROM inserted i
        LEFT JOIN catalog_categories c ON c.id = i.category_id
        LEFT JOIN catalog_brands b ON b.id = i.brand_id
      `,
      [
        slug,
        input.payload.name,
        input.payload.description ?? null,
        categoryId,
        brandId,
        input.payload.countryOfOrigin ?? null,
        input.payload.isTaxable,
        input.payload.taxCategory ?? null,
        input.payload.priceIncludesTax,
        input.payload.status,
        input.actorId,
        input.now,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Unable to create product.");
    return {
      ...toProductSummary(row),
      options: [],
      variants: [] as AdminVariantSummary[],
    };
  }

  async updateProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateProductRequest;
    slug: string;
  }): Promise<AdminProductDetail | null> {
    const sets: string[] = ["updated_at = $2"];
    const values: unknown[] = [input.slug, input.now];

    if (input.payload.name !== undefined) {
      values.push(input.payload.name);
      sets.push(`name = $${values.length}`);
    }
    if ("description" in input.payload) {
      values.push(input.payload.description ?? null);
      sets.push(`description = $${values.length}`);
    }
    if ("categorySlug" in input.payload) {
      values.push(
        await resolveCategoryId(this.pool, input.payload.categorySlug ?? null),
      );
      sets.push(`category_id = $${values.length}`);
    }
    if ("brandSlug" in input.payload) {
      values.push(
        await resolveBrandId(this.pool, input.payload.brandSlug ?? null),
      );
      sets.push(`brand_id = $${values.length}`);
    }
    if ("countryOfOrigin" in input.payload) {
      values.push(input.payload.countryOfOrigin ?? null);
      sets.push(`country_of_origin = $${values.length}`);
    }
    if (input.payload.isTaxable !== undefined) {
      values.push(input.payload.isTaxable);
      sets.push(`is_taxable = $${values.length}`);
    }
    if ("taxCategory" in input.payload) {
      values.push(input.payload.taxCategory ?? null);
      sets.push(`tax_category = $${values.length}`);
    }
    if (input.payload.features !== undefined) {
      values.push(JSON.stringify(input.payload.features));
      sets.push(`features = $${values.length}`);
    }
    if (input.payload.priceIncludesTax !== undefined) {
      values.push(input.payload.priceIncludesTax);
      sets.push(`price_includes_tax = $${values.length}`);
    }
    if (input.payload.status !== undefined) {
      if (input.payload.status === "archived") {
        await assertProductCanBeArchived(this.pool, input.slug);
        values.push(input.now);
        sets.push(`archived_at = $${values.length}`);
      }
      values.push(input.payload.status);
      sets.push(`status = $${values.length}`);
    }

    const result = await this.pool.query<ProductSummaryRow>(
      `
        WITH updated AS (
          UPDATE catalog_products SET ${sets.join(", ")}
          WHERE slug = $1
          RETURNING
            id, slug, name, description, features, category_id, brand_id,
            country_of_origin, is_taxable, tax_category, price_includes_tax,
            status, created_at, archived_at
        )
        SELECT
          u.slug, u.name, u.description, u.features,
          c.slug AS "categorySlug",
          b.slug AS "brandSlug",
          u.country_of_origin AS "countryOfOrigin",
          u.is_taxable AS "isTaxable",
          u.tax_category AS "taxCategory",
          u.price_includes_tax AS "priceIncludesTax",
          u.status,
          COUNT(v.id)::int AS "variantCount",
          u.created_at AS "createdAt",
          u.archived_at AS "archivedAt"
        FROM updated u
        LEFT JOIN catalog_categories c ON c.id = u.category_id
        LEFT JOIN catalog_brands b ON b.id = u.brand_id
        LEFT JOIN product_variants v ON v.product_id = u.id
        GROUP BY
          u.id, u.slug, u.name, u.description, u.features, c.slug, b.slug,
          u.country_of_origin, u.is_taxable, u.tax_category,
          u.price_includes_tax, u.status, u.created_at, u.archived_at
      `,
      values,
    );

    const row = result.rows[0];
    if (!row) return null;

    const variantResult = await this.pool.query<VariantRow>(
      `SELECT ${VARIANT_RETURNING} FROM product_variants v
       JOIN catalog_products p ON p.id = v.product_id
       WHERE p.slug = $1 ORDER BY v.is_default DESC, v.created_at ASC`,
      [input.slug],
    );

    return {
      ...toProductSummary(row),
      options: [],
      variants: variantResult.rows.map(toVariantSummary),
    };
  }
}
