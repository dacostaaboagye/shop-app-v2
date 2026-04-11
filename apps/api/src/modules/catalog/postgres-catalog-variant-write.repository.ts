import type {
  AdminCreateVariantRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import type { Pool } from "pg";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { getVariantStatusPatch } from "./catalog-variant-write.support.js";
import { assertVariantCanBeArchived } from "./postgres-catalog-product-archive-guard.js";
import {
  toVariantSummary,
  translateDuplicateKey,
  VARIANT_RETURNING,
  type VariantRow,
} from "./postgres-catalog-product-write.support.js";

export type CatalogVariantRepository = {
  createVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateVariantRequest;
    productSlug: string;
  }): Promise<AdminVariantSummary>;
  updateVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateVariantRequest;
    productSlug: string;
    variantSlug: string;
  }): Promise<AdminVariantSummary | null>;
};

export class PostgresCatalogVariantWriteRepository
  implements CatalogVariantRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly slugAllocator: SlugAllocator,
  ) {}

  async createVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateVariantRequest;
    productSlug: string;
  }) {
    const productResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM catalog_products WHERE slug = $1`,
      [input.productSlug],
    );
    const productId = productResult.rows[0]?.id;
    if (!productId) {
      throw new AppError({
        code: "not_found",
        detail: `Product "${input.productSlug}" does not exist.`,
        statusCode: 404,
        title: "Product not found",
      });
    }

    const slug = await this.slugAllocator.allocateSlug({
      entityType: "product_variant",
      value: input.payload.name,
    });

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      if (input.payload.isDefault) {
        await client.query(
          `UPDATE product_variants SET is_default = false, updated_at = $2
           WHERE product_id = $1 AND is_default = true`,
          [productId, input.now],
        );
      }

      const result = await client.query<VariantRow>(
        `INSERT INTO product_variants (
            product_id, slug, name, sku, barcode, unit_of_measure,
            cost_price, selling_price, attributes,
            weight_grams, dimensions_cm, packaging_type,
            manufacturer_part_number, customs_code,
            is_default, status, created_by, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
          RETURNING ${VARIANT_RETURNING}`,
        [
          productId,
          slug,
          input.payload.name,
          input.payload.sku,
          input.payload.barcode ?? null,
          input.payload.unitOfMeasure,
          input.payload.costPrice,
          input.payload.sellingPrice,
          JSON.stringify(input.payload.attributes),
          input.payload.weightGrams ?? null,
          input.payload.dimensionsCm
            ? JSON.stringify(input.payload.dimensionsCm)
            : null,
          input.payload.packagingType ?? null,
          input.payload.manufacturerPartNumber ?? null,
          input.payload.customsCode ?? null,
          input.payload.isDefault,
          input.payload.status,
          input.actorId,
          input.now,
        ],
      );

      await client.query("COMMIT");
      const row = result.rows[0];
      if (!row) throw new Error("Unable to create variant.");
      return toVariantSummary(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw translateDuplicateKey(error, input.payload.sku);
    } finally {
      client.release();
    }
  }

  async updateVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateVariantRequest;
    productSlug: string;
    variantSlug: string;
  }) {
    const productResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM catalog_products WHERE slug = $1`,
      [input.productSlug],
    );
    const productId = productResult.rows[0]?.id;
    if (!productId) return null;

    if (input.payload.status === "archived") {
      await assertVariantCanBeArchived(this.pool, input.variantSlug);
    }

    const statusPatch = getVariantStatusPatch(input.payload, input.now);

    const sets: string[] = ["updated_at = $3"];
    const values: unknown[] = [productId, input.variantSlug, input.now];

    const fields: Array<[keyof AdminUpdateVariantRequest, string]> = [
      ["name", "name"],
      ["sku", "sku"],
      ["unitOfMeasure", "unit_of_measure"],
      ["costPrice", "cost_price"],
      ["sellingPrice", "selling_price"],
      ["packagingType", "packaging_type"],
      ["status", "status"],
    ];

    for (const [key, col] of fields) {
      if (input.payload[key] !== undefined) {
        values.push(input.payload[key]);
        sets.push(`${col} = $${values.length}`);
      }
    }

    const nullableFields: Array<[keyof AdminUpdateVariantRequest, string]> = [
      ["barcode", "barcode"],
      ["weightGrams", "weight_grams"],
      ["manufacturerPartNumber", "manufacturer_part_number"],
      ["customsCode", "customs_code"],
    ];

    for (const [key, col] of nullableFields) {
      if (key in input.payload) {
        values.push(input.payload[key] ?? null);
        sets.push(`${col} = $${values.length}`);
      }
    }

    if ("dimensionsCm" in input.payload) {
      values.push(
        input.payload.dimensionsCm
          ? JSON.stringify(input.payload.dimensionsCm)
          : null,
      );
      sets.push(`dimensions_cm = $${values.length}`);
    }

    if (input.payload.attributes !== undefined) {
      values.push(JSON.stringify(input.payload.attributes));
      sets.push(`attributes = $${values.length}`);
    }

    if (statusPatch.archivedAt !== undefined) {
      values.push(statusPatch.archivedAt);
      sets.push(`archived_at = $${values.length}`);
    }

    if (statusPatch.isDefault !== undefined) {
      values.push(statusPatch.isDefault);
      sets.push(`is_default = $${values.length}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      if (input.payload.isDefault === true) {
        await client.query(
          `UPDATE product_variants SET is_default = false, updated_at = $2
           WHERE product_id = $1 AND is_default = true AND slug != $3`,
          [productId, input.now, input.variantSlug],
        );
      }

      const result = await client.query<VariantRow>(
        `UPDATE product_variants SET ${sets.join(", ")}
         WHERE product_id = $1 AND slug = $2
         RETURNING ${VARIANT_RETURNING}`,
        values,
      );

      await client.query("COMMIT");
      const row = result.rows[0];
      if (!row) return null;
      return toVariantSummary(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw translateDuplicateKey(error, input.payload.sku ?? "");
    } finally {
      client.release();
    }
  }
}
