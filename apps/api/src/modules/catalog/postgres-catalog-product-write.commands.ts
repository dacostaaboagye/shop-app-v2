import type {
  AdminCreateProductRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
} from "@shop/contracts";
import { catalogProducts, productVariants } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { CatalogChangeLogWriter } from "../catalog-change-log/catalog-change-log-writer.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { snapshotProduct } from "./catalog-change-tracking.js";
import {
  recordProductDeletion,
  recordProductUpdate,
  recordVariantArchiveCascade,
} from "./catalog-product-change-log.js";
import {
  archiveActiveVariantsForProduct,
  buildProductUpdates,
  loadProductDetailAggregate,
  loadProductVariants,
} from "./catalog-product-write.commands.support.js";
import type { PostgresCatalogProductDeleteGuard } from "./postgres-catalog-product-delete-guard.js";
import {
  deleteProductMediaAssignments,
  resolveBrandId,
  resolveCategoryId,
  toProductDetail,
} from "./postgres-catalog-product-write.support.js";

export class CatalogProductCommands {
  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly deleteGuard: PostgresCatalogProductDeleteGuard,
    private readonly changeLogWriter: CatalogChangeLogWriter,
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

    const inserted = await this.db.transaction(async (tx) => {
      const [row] = await tx
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

      if (!row) throw new Error("Unable to create product.");

      await this.changeLogWriter.record(tx, {
        entityType: "catalog_product",
        entityId: row.id,
        entityRef: row.slug,
        operation: "created",
        changedFields: [],
        before: null,
        after: snapshotProduct(row),
        actorId: input.actorId,
        occurredAt: input.now,
      });

      return row;
    });

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
    const updates = await buildProductUpdates(
      this.db,
      input.payload,
      input.now,
    );

    const product = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(catalogProducts)
        .where(eq(catalogProducts.slug, input.slug));

      if (!before) return null;

      const [updated] = await tx
        .update(catalogProducts)
        .set(updates)
        .where(eq(catalogProducts.slug, input.slug))
        .returning();

      if (!updated) return null;

      await recordProductUpdate(
        tx,
        this.changeLogWriter,
        before,
        updated,
        input,
      );

      if (updates.status === "archived") {
        const cascade = await archiveActiveVariantsForProduct(
          tx,
          updated.id,
          input.now,
        );
        await recordVariantArchiveCascade(
          tx,
          this.changeLogWriter,
          updated.id,
          cascade,
          input,
        );
      }

      const row = await loadProductDetailAggregate(tx, updated.id);
      const variants = await loadProductVariants(tx, updated.id);
      return { updated, row, variants };
    });

    if (!product) return null;
    return toProductDetail(product);
  }

  async getProductForDeleteEvent(
    slug: string,
  ): Promise<AdminProductDetail | null> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, slug),
      with: {
        brand: { columns: { slug: true } },
        category: { columns: { slug: true } },
        variants: true,
      },
    });

    if (!product) return null;

    return toProductDetail({
      row: {
        brandSlug: product.brand?.slug ?? null,
        categorySlug: product.category?.slug ?? null,
        variantCount: product.variants.length,
      },
      updated: product,
      variants: product.variants,
    });
  }

  async delete(input: {
    actorId: string;
    now: Date;
    slug: string;
  }): Promise<void> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, input.slug),
      with: { variants: true },
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
      await deleteProductMediaAssignments(
        tx,
        input.slug,
        product.variants.map((variant) => variant.slug),
      );

      await recordProductDeletion(
        tx,
        this.changeLogWriter,
        product,
        product.variants,
        input,
      );

      await tx
        .delete(productVariants)
        .where(eq(productVariants.productId, product.id));

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
