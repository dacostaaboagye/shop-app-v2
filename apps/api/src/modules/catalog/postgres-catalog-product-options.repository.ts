import type {
  AdminAddOptionValueRequest,
  AdminCreateProductOptionRequest,
  AdminProductOption,
} from "@shop/contracts";
import type { Pool } from "pg";
import { AppError } from "../_core/errors/app-error.js";

export class PostgresCatalogProductOptionsRepository {
  constructor(private readonly pool: Pick<Pool, "query">) {}

  async createOption(
    productSlug: string,
    payload: AdminCreateProductOptionRequest,
    now: Date,
  ): Promise<AdminProductOption> {
    const productResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM catalog_products WHERE slug = $1`,
      [productSlug],
    );
    const productId = productResult.rows[0]?.id;
    if (!productId) {
      throw new AppError({
        code: "not_found",
        detail: `Product "${productSlug}" does not exist.`,
        statusCode: 404,
        title: "Product not found",
      });
    }

    const posResult = await this.pool.query<{ max: number | null }>(
      `SELECT MAX(position) AS max FROM catalog_product_options WHERE product_id = $1`,
      [productId],
    );
    const nextPos = (posResult.rows[0]?.max ?? -1) + 1;

    const optResult = await this.pool.query<{ id: string }>(
      `INSERT INTO catalog_product_options (product_id, name, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4) RETURNING id`,
      [productId, payload.name, nextPos, now],
    );
    const optionId = optResult.rows[0]?.id;
    if (!optionId) throw new Error("Unable to create option.");

    const values: AdminProductOption["values"] = [];
    for (let i = 0; i < payload.values.length; i++) {
      const valResult = await this.pool.query<{ id: string }>(
        `INSERT INTO catalog_product_option_values (option_id, value, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4) RETURNING id`,
        [optionId, payload.values[i], i, now],
      );
      const valId = valResult.rows[0]?.id;
      const valText = payload.values[i];
      if (valId && valText)
        values.push({ valueId: valId, position: i, value: valText });
    }

    return { optionId, name: payload.name, position: nextPos, values };
  }

  async deleteOption(productSlug: string, optionId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM catalog_product_options
       WHERE id = $1
         AND product_id = (SELECT id FROM catalog_products WHERE slug = $2)`,
      [optionId, productSlug],
    );
    if (result.rowCount === 0) {
      throw new AppError({
        code: "not_found",
        detail: `Option does not exist on product "${productSlug}".`,
        statusCode: 404,
        title: "Option not found",
      });
    }
  }

  async addOptionValue(
    optionId: string,
    payload: AdminAddOptionValueRequest,
    now: Date,
  ): Promise<{ valueId: string; position: number; value: string }> {
    const posResult = await this.pool.query<{ max: number | null }>(
      `SELECT MAX(position) AS max FROM catalog_product_option_values WHERE option_id = $1`,
      [optionId],
    );
    const nextPos = (posResult.rows[0]?.max ?? -1) + 1;

    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO catalog_product_option_values (option_id, value, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4) RETURNING id`,
      [optionId, payload.value, nextPos, now],
    );
    const valueId = result.rows[0]?.id;
    if (!valueId) throw new Error("Unable to add option value.");
    return { valueId, position: nextPos, value: payload.value };
  }

  async deleteOptionValue(optionId: string, valueId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM catalog_product_option_values WHERE id = $1 AND option_id = $2`,
      [valueId, optionId],
    );
    if (result.rowCount === 0) {
      throw new AppError({
        code: "not_found",
        detail: "Option value not found.",
        statusCode: 404,
        title: "Value not found",
      });
    }
  }
}
