import type {
  AdminCreateProductRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogMediaAssignments,
  catalogProducts,
  productVariants,
} from "@shop/database";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import {
  resolveBrandId,
  resolveCategoryId,
} from "./postgres-catalog-product-write.support.js";
import type { PostgresCatalogProductDeleteGuard } from "./postgres-catalog-product-delete-guard.js";

export class CatalogProductCommands {
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogProductDeleteGuard,
  ) {}

  async create(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateProductRequest;
  }): Promise<AdminProductDetail> {
    const categoryId = await resolveCategoryId(
      this.db,
      input.payload.categorySlug ?? null,
    );
    const brandId = await resolveBrandId(
      this.db,
      input.payload.brandSlug ?? null,
    );
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "catalog_product",
      value: input.payload.name,
    });

    const [inserted] = await this.db
      .insert(catalogProducts)
      .values({
        slug,
        name: input.payload.name,
        description: input.payload.description ?? null,
        categoryId,
        brandId,
        countryOfOrigin: input.payload.countryOfOrigin ?? null,
        isTaxable: input.payload.isTaxable,
        taxCategory: input.payload.taxCategory ?? null,
        priceIncludesTax: input.payload.priceIncludesTax,
        status: input.payload.status,
        createdBy: input.actorId,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning();

    if (!inserted) throw new Error("Unable to create product.");

    return {
      slug: inserted.slug,
      name: inserted.name,
      description: inserted.description,
      features: inserted.features,
      categorySlug: input.payload.categorySlug ?? null,
      brandSlug: input.payload.brandSlug ?? null,
      countryOfOrigin: inserted.countryOfOrigin,
      isTaxable: inserted.isTaxable,
      taxCategory: inserted.taxCategory,
      priceIncludesTax: inserted.priceIncludesTax,
      status: inserted.status,
      variantCount: 0,
      createdAt: inserted.createdAt.toISOString(),
      archivedAt: inserted.archivedAt?.toISOString() ?? null,
      options: [],
      variants: [],
    };
  }

  async update(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateProductRequest;
    slug: string;
  }): Promise<AdminProductDetail | null> {
    const updates: Partial<typeof catalogProducts.$inferInsert> = {
      updatedAt: input.now,
    };

    if (input.payload.name !== undefined) updates.name = input.payload.name;
    if ("description" in input.payload)
      updates.description = input.payload.description ?? null;
    if ("categorySlug" in input.payload) {
      updates.categoryId = await resolveCategoryId(
        this.db,
        input.payload.categorySlug ?? null,
      );
    }
    if ("brandSlug" in input.payload) {
      updates.brandId = await resolveBrandId(
        this.db,
        input.payload.brandSlug ?? null,
      );
    }
    if ("countryOfOrigin" in input.payload)
      updates.countryOfOrigin = input.payload.countryOfOrigin ?? null;
    if (input.payload.isTaxable !== undefined)
      updates.isTaxable = input.payload.isTaxable;
    if ("taxCategory" in input.payload)
      updates.taxCategory = input.payload.taxCategory ?? null;
    if (input.payload.features !== undefined)
      updates.features = input.payload.features;
    if (input.payload.priceIncludesTax !== undefined)
      updates.priceIncludesTax = input.payload.priceIncludesTax;

    if (input.payload.status !== undefined) {
      if (input.payload.status === "archived") {
        updates.archivedAt = input.now;
      }
      updates.status = input.payload.status;
    }

    const product = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(catalogProducts)
        .set(updates)
        .where(eq(catalogProducts.slug, input.slug))
        .returning();

      if (!updated) return null;

      if (updates.status === "archived") {
        await tx
          .update(productVariants)
          .set({
            status: "archived",
            archivedAt: input.now,
            updatedAt: input.now,
          })
          .where(
            and(
              eq(productVariants.productId, updated.id),
              ne(productVariants.status, "archived"),
            ),
          );
      }

      const [row] = await tx
        .select({
          categorySlug: catalogCategories.slug,
          brandSlug: catalogBrands.slug,
          variantCount: sql<number>`cast(count(${productVariants.id}) as int)`,
        })
        .from(catalogProducts)
        .leftJoin(
          catalogCategories,
          eq(catalogCategories.id, catalogProducts.categoryId),
        )
        .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
        .leftJoin(
          productVariants,
          eq(productVariants.productId, catalogProducts.id),
        )
        .where(eq(catalogProducts.id, updated.id))
        .groupBy(
          catalogProducts.id,
          catalogCategories.slug,
          catalogBrands.slug,
        );

      const variants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, updated.id))
        .orderBy(
          desc(productVariants.isDefault),
          asc(productVariants.createdAt),
        );

      return { updated, row, variants };
    });

    if (!product) return null;

    return {
      slug: product.updated.slug,
      name: product.updated.name,
      description: product.updated.description,
      features: product.updated.features,
      categorySlug: product.row?.categorySlug ?? null,
      brandSlug: product.row?.brandSlug ?? null,
      countryOfOrigin: product.updated.countryOfOrigin,
      isTaxable: product.updated.isTaxable,
      taxCategory: product.updated.taxCategory,
      priceIncludesTax: product.updated.priceIncludesTax,
      status: product.updated.status,
      variantCount: product.row?.variantCount ?? 0,
      createdAt: product.updated.createdAt.toISOString(),
      archivedAt: product.updated.archivedAt?.toISOString() ?? null,
      options: [],
      variants: product.variants.map((v) => ({
        slug: v.slug,
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        unitOfMeasure: v.unitOfMeasure,
        costPrice: v.costPrice,
        sellingPrice: v.sellingPrice,
        attributes: v.attributes,
        weightGrams: v.weightGrams,
        dimensionsCm: v.dimensionsCm ?? null,
        packagingType: v.packagingType,
        manufacturerPartNumber: v.manufacturerPartNumber,
        customsCode: v.customsCode,
        isDefault: v.isDefault,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        archivedAt: v.archivedAt?.toISOString() ?? null,
      })),
    };
  }

  async delete(input: { slug: string }): Promise<void> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, input.slug),
      columns: { id: true, name: true },
      with: {
        variants: {
          columns: { id: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new AppError({
        code: "not_found",
        detail: `Product "${input.slug}" not found.`,
        statusCode: 404,
        title: "Product not found",
      });
    }

    await this.deleteGuard.assertCanDeleteProduct(input.slug);

    await this.db.transaction(async (tx) => {
      const variants = product.variants ?? [];

      // 1. Delete media assignments for product
      await tx.delete(catalogMediaAssignments).where(
        and(
          eq(catalogMediaAssignments.entityType, "product"),
          eq(catalogMediaAssignments.entitySlug, input.slug),
        ),
      );

      // 2. Delete media assignments for all variants
      for (const variant of variants) {
        await tx.delete(catalogMediaAssignments).where(
          and(
            eq(catalogMediaAssignments.entityType, "variant"),
            eq(catalogMediaAssignments.entitySlug, variant.slug),
          ),
        );
      }

      // 3. Delete all variants
      await tx
        .delete(productVariants)
        .where(eq(productVariants.productId, product.id));

      // 4. Delete the product itself (options will cascade delete via DB FK)
      const result = await tx
        .delete(catalogProducts)
        .where(eq(catalogProducts.id, product.id))
        .returning();

      if (result.length === 0) {
        throw new Error("Unable to delete product.");
      }
    });
  }
}
