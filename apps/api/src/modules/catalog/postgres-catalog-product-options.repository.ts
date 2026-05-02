import type {
  AdminAddOptionValueRequest,
  AdminCreateProductOptionRequest,
  AdminProductOption,
} from "@shop/contracts";
import {
  catalogProductOptions,
  catalogProductOptionValues,
} from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import {
  optionNotFound,
  optionValueNotFound,
  requireOptionById,
  requireProductByOptionsSlug,
} from "./catalog-options.support.js";
import {
  recordOptionCreated,
  recordOptionDeleted,
  recordOptionValueCreated,
  recordOptionValueDeleted,
} from "./catalog-options-change-log.js";

export type ProductOptionMutationContext = {
  actorId: string;
  now: Date;
};

export class PostgresCatalogProductOptionsRepository {
  constructor(
    private readonly db: ApiDatabase,
    private readonly changeLogWriter: CatalogChangeLogWriter,
  ) {}

  async createOption(
    productSlug: string,
    payload: AdminCreateProductOptionRequest,
    ctx: ProductOptionMutationContext,
  ): Promise<AdminProductOption> {
    const product = await requireProductByOptionsSlug(this.db, productSlug);

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
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .returning();

      if (!option) throw new Error("Unable to create option");

      await recordOptionCreated(
        tx,
        this.changeLogWriter,
        product.id,
        option,
        ctx,
      );

      const values: AdminProductOption["values"] = [];
      for (const [position, value] of payload.values.entries()) {
        const [val] = await tx
          .insert(catalogProductOptionValues)
          .values({
            optionId: option.id,
            value,
            position,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .returning();

        if (!val) throw new Error("Unable to create option value");

        await recordOptionValueCreated(
          tx,
          this.changeLogWriter,
          product.id,
          val,
          ctx,
        );

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

  async deleteOption(
    productSlug: string,
    optionId: string,
    ctx: ProductOptionMutationContext,
  ): Promise<void> {
    const product = await requireProductByOptionsSlug(this.db, productSlug);

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogProductOptions)
        .where(
          and(
            eq(catalogProductOptions.id, optionId),
            eq(catalogProductOptions.productId, product.id),
          ),
        );

      if (!before) throw optionNotFound(productSlug);

      await recordOptionDeleted(
        tx,
        this.changeLogWriter,
        product.id,
        before,
        ctx,
      );

      const result = await tx
        .delete(catalogProductOptions)
        .where(
          and(
            eq(catalogProductOptions.id, optionId),
            eq(catalogProductOptions.productId, product.id),
          ),
        );

      if (result.rowCount === 0) throw optionNotFound(productSlug);
    });
  }

  async addOptionValue(
    optionId: string,
    payload: AdminAddOptionValueRequest,
    ctx: ProductOptionMutationContext,
  ): Promise<{ valueId: string; position: number; value: string }> {
    const option = await requireOptionById(this.db, optionId);

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
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .returning();

      if (!val) throw new Error("Unable to create option value");

      await recordOptionValueCreated(
        tx,
        this.changeLogWriter,
        option.productId,
        val,
        ctx,
      );

      return {
        valueId: val.id,
        position: val.position,
        value: val.value,
      };
    });
  }

  async deleteOptionValue(
    optionId: string,
    valueId: string,
    ctx: ProductOptionMutationContext,
  ): Promise<void> {
    const option = await requireOptionById(this.db, optionId);

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogProductOptionValues)
        .where(
          and(
            eq(catalogProductOptionValues.id, valueId),
            eq(catalogProductOptionValues.optionId, optionId),
          ),
        );

      if (!before) throw optionValueNotFound();

      await recordOptionValueDeleted(
        tx,
        this.changeLogWriter,
        option.productId,
        before,
        ctx,
      );

      const result = await tx
        .delete(catalogProductOptionValues)
        .where(
          and(
            eq(catalogProductOptionValues.id, valueId),
            eq(catalogProductOptionValues.optionId, optionId),
          ),
        );

      if (result.rowCount === 0) throw optionValueNotFound();
    });
  }
}
