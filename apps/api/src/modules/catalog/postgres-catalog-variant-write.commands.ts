import type {
  AdminCreateVariantRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import { catalogMediaAssignments, productVariants } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import {
  recordVariantCreated,
  recordVariantDeleted,
  recordVariantUpdate,
} from "./catalog-variant-change-log.js";
import {
  buildVariantUpdates,
  clearExistingDefaultVariant,
  findProductIdBySlug,
  requireProductIdBySlug,
  toAdminVariantSummary,
} from "./catalog-variant-write.support.js";
import type { PostgresCatalogProductDeleteGuard } from "./postgres-catalog-product-delete-guard.js";
import { translateDuplicateKey } from "./postgres-catalog-product-write.support.js";

export class CatalogVariantCommands {
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogProductDeleteGuard,
    private readonly changeLogWriter: CatalogChangeLogWriter,
  ) {}

  async create(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateVariantRequest;
    productSlug: string;
  }): Promise<AdminVariantSummary> {
    const productId = await requireProductIdBySlug(this.db, input.productSlug);

    const slug = await this.slugAllocator.allocateSlug({
      entityType: "product_variant",
      value: input.payload.name,
    });

    try {
      const inserted = await this.db.transaction(async (tx) => {
        if (input.payload.isDefault) {
          await clearExistingDefaultVariant(tx, input.now, productId);
        }

        const [row] = await tx
          .insert(productVariants)
          .values({
            productId,
            slug,
            name: input.payload.name,
            sku: input.payload.sku,
            barcode: input.payload.barcode ?? null,
            unitOfMeasure: input.payload.unitOfMeasure,
            costPrice: input.payload.costPrice,
            sellingPrice: input.payload.sellingPrice,
            attributes: input.payload.attributes,
            weightGrams: input.payload.weightGrams ?? null,
            dimensionsCm: input.payload.dimensionsCm ?? null,
            packagingType: input.payload.packagingType ?? null,
            manufacturerPartNumber:
              input.payload.manufacturerPartNumber ?? null,
            customsCode: input.payload.customsCode ?? null,
            isTaxable: input.payload.isTaxable ?? null,
            taxCategory: input.payload.taxCategory ?? null,
            isDefault: input.payload.isDefault,
            status: input.payload.status,
            createdBy: input.actorId,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .returning();

        if (!row) throw new Error("Unable to create variant.");

        await recordVariantCreated(
          tx,
          this.changeLogWriter,
          productId,
          row,
          input,
        );

        return row;
      });

      return toAdminVariantSummary(inserted);
    } catch (error) {
      throw translateDuplicateKey(error, input.payload.sku);
    }
  }

  async update(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateVariantRequest;
    productSlug: string;
    variantSlug: string;
  }): Promise<AdminVariantSummary | null> {
    const productId = await findProductIdBySlug(this.db, input.productSlug);
    if (!productId) return null;

    const updates = buildVariantUpdates(input.payload, input.now);

    try {
      const updated = await this.db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(productVariants)
          .where(
            and(
              eq(productVariants.productId, productId),
              eq(productVariants.slug, input.variantSlug),
            ),
          );

        if (!before) return null;

        if (input.payload.isDefault === true) {
          await clearExistingDefaultVariant(tx, input.now, productId);
        }

        const [row] = await tx
          .update(productVariants)
          .set(updates)
          .where(
            and(
              eq(productVariants.productId, productId),
              eq(productVariants.slug, input.variantSlug),
            ),
          )
          .returning();

        if (!row) return null;

        await recordVariantUpdate(
          tx,
          this.changeLogWriter,
          productId,
          before,
          row,
          input,
        );

        return row;
      });

      if (!updated) return null;
      return toAdminVariantSummary(updated);
    } catch (error) {
      throw translateDuplicateKey(error, input.payload.sku ?? "");
    }
  }

  async delete(input: {
    actorId: string;
    now: Date;
    productSlug: string;
    variantSlug: string;
  }): Promise<void> {
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.slug, input.variantSlug),
      with: {
        product: { columns: { slug: true } },
      },
    });

    if (!variant || variant.product.slug !== input.productSlug) {
      throw new AppError({
        code: "not_found",
        detail: `Variant "${input.variantSlug}" not found for product "${input.productSlug}".`,
        statusCode: 404,
        title: "Variant not found",
      });
    }

    await this.deleteGuard.assertCanDeleteVariant(variant.id, variant.sku);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entityType, "variant"),
            eq(catalogMediaAssignments.entitySlug, input.variantSlug),
          ),
        );

      await recordVariantDeleted(
        tx,
        this.changeLogWriter,
        variant.productId,
        variant,
        input,
      );

      const result = await tx
        .delete(productVariants)
        .where(eq(productVariants.id, variant.id))
        .returning();

      if (result.length === 0) {
        throw new Error("Unable to delete variant.");
      }
    });
  }
}
