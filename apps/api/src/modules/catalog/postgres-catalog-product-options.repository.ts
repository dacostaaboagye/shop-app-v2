import type {
  AdminAddOptionValueRequest,
  AdminCreateProductOptionRequest,
  AdminProductOption,
} from "@shop/contracts";
import {
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export class PostgresCatalogProductOptionsRepository {
  constructor(private readonly db: ApiDatabase) {}

  async createOption(
    productSlug: string,
    payload: AdminCreateProductOptionRequest,
    now: Date,
  ): Promise<AdminProductOption> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, productSlug),
      columns: { id: true },
    });

    if (!product) {
      throw new AppError({
        code: "not_found",
        detail: `Product "${productSlug}" does not exist.`,
        statusCode: 404,
        title: "Product not found",
      });
    }

    return await this.db.transaction(async (tx) => {
      const posResult = await tx
        .select({ max: sql<number>`max(${catalogProductOptions.position})` })
        .from(catalogProductOptions)
        .where(eq(catalogProductOptions.productId, product.id));

      const nextPos = (posResult[0]?.max ?? -1) + 1;

      const [option] = await tx
        .insert(catalogProductOptions)
        .values({
          productId: product.id,
          name: payload.name,
          position: nextPos,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!option) throw new Error("Unable to create option");

      const values: AdminProductOption["values"] = [];
      for (const [position, value] of payload.values.entries()) {
        const [val] = await tx
          .insert(catalogProductOptionValues)
          .values({
            optionId: option.id,
            value,
            position,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!val) throw new Error("Unable to create option value");

        values.push({
          valueId: val.id,
          position: val.position,
          value: val.value,
        });
      }

      return {
        optionId: option.id,
        name: option.name,
        position: option.position,
        values,
      };
    });
  }

  async deleteOption(productSlug: string, optionId: string): Promise<void> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, productSlug),
      columns: { id: true },
    });

    if (!product) {
      throw new AppError({
        code: "not_found",
        detail: `Product "${productSlug}" does not exist.`,
        statusCode: 404,
        title: "Product not found",
      });
    }

    const result = await this.db
      .delete(catalogProductOptions)
      .where(
        and(
          eq(catalogProductOptions.id, optionId),
          eq(catalogProductOptions.productId, product.id),
        ),
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
    return await this.db.transaction(async (tx) => {
      const posResult = await tx
        .select({
          max: sql<number>`max(${catalogProductOptionValues.position})`,
        })
        .from(catalogProductOptionValues)
        .where(eq(catalogProductOptionValues.optionId, optionId));

      const nextPos = (posResult[0]?.max ?? -1) + 1;

      const [val] = await tx
        .insert(catalogProductOptionValues)
        .values({
          optionId,
          value: payload.value,
          position: nextPos,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!val) throw new Error("Unable to create option value");

      return {
        valueId: val.id,
        position: val.position,
        value: val.value,
      };
    });
  }

  async deleteOptionValue(optionId: string, valueId: string): Promise<void> {
    const result = await this.db
      .delete(catalogProductOptionValues)
      .where(
        and(
          eq(catalogProductOptionValues.id, valueId),
          eq(catalogProductOptionValues.optionId, optionId),
        ),
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
