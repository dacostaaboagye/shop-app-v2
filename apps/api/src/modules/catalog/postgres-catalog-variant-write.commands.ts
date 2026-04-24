import type {
  AdminCreateVariantRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import { catalogMediaAssignments, productVariants } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import {
  clearExistingDefaultVariant,
  findProductIdBySlug,
  getVariantStatusPatch,
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

        return row;
      });

      if (!inserted) throw new Error("Unable to create variant.");

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

    const statusPatch = getVariantStatusPatch(input.payload, input.now);

    const updates: Partial<typeof productVariants.$inferInsert> = {
      updatedAt: input.now,
    };

    if (input.payload.name !== undefined) updates.name = input.payload.name;
    if (input.payload.sku !== undefined) updates.sku = input.payload.sku;
    if (input.payload.unitOfMeasure !== undefined)
      updates.unitOfMeasure = input.payload.unitOfMeasure;
    if (input.payload.costPrice !== undefined)
      updates.costPrice = input.payload.costPrice;
    if (input.payload.sellingPrice !== undefined)
      updates.sellingPrice = input.payload.sellingPrice;
    if (input.payload.packagingType !== undefined)
      updates.packagingType = input.payload.packagingType ?? null;
    if (input.payload.status !== undefined)
      updates.status = input.payload.status;

    if ("barcode" in input.payload)
      updates.barcode = input.payload.barcode ?? null;
    if ("weightGrams" in input.payload)
      updates.weightGrams = input.payload.weightGrams ?? null;
    if ("manufacturerPartNumber" in input.payload)
      updates.manufacturerPartNumber =
        input.payload.manufacturerPartNumber ?? null;
    if ("customsCode" in input.payload)
      updates.customsCode = input.payload.customsCode ?? null;
    if ("isTaxable" in input.payload)
      updates.isTaxable = input.payload.isTaxable ?? null;
    if ("taxCategory" in input.payload)
      updates.taxCategory = input.payload.taxCategory ?? null;
    if ("dimensionsCm" in input.payload)
      updates.dimensionsCm = input.payload.dimensionsCm ?? null;

    if (input.payload.attributes !== undefined)
      updates.attributes = input.payload.attributes;

    if (statusPatch.archivedAt !== undefined)
      updates.archivedAt = statusPatch.archivedAt;
    if (statusPatch.isDefault !== undefined)
      updates.isDefault = statusPatch.isDefault;

    try {
      const updated = await this.db.transaction(async (tx) => {
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

        return row;
      });

      if (!updated) return null;

      return toAdminVariantSummary(updated);
    } catch (error) {
      throw translateDuplicateKey(error, input.payload.sku ?? "");
    }
  }

  async delete(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<void> {
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.slug, input.variantSlug),
      columns: { id: true, sku: true, productId: true, slug: true },
      with: {
        product: {
          columns: { slug: true },
        },
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
      // 1. Delete media assignments
      await tx
        .delete(catalogMediaAssignments)
        .where(
          and(
            eq(catalogMediaAssignments.entityType, "variant"),
            eq(catalogMediaAssignments.entitySlug, input.variantSlug),
          ),
        );

      // 2. Delete the variant
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
