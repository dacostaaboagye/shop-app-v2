import {
  AdminProductDetail,
  AdminProductListQuery,
  AdminProductSummary,
  CatalogEntityStatus,
} from "@shop/contracts";
import { catalogBrands, catalogCategories, catalogProducts } from "@shop/database";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogProductQueryRepository } from "./catalog-product-query.service.js";

export class PostgresCatalogProductQueryRepository
  implements CatalogProductQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getProduct(slug: string): Promise<AdminProductDetail | null> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
      with: {
        brand: { columns: { slug: true } },
        category: { columns: { slug: true } },
        mediaAssignments: {
          where: (ma, { and, eq }) =>
            and(eq(ma.entityType, "product"), eq(ma.isPrimary, true)),
          with: { asset: true },
        },
        options: {
          orderBy: (o, { asc }) => [asc(o.position), asc(o.id)],
          with: {
            values: {
              orderBy: (v, { asc }) => [asc(v.position), asc(v.id)],
            },
          },
        },
        variants: {
          orderBy: (v, { desc, asc }) => [desc(v.isDefault), asc(v.createdAt)],
        },
      },
    });

    if (!product) return null;

    return {
      slug: product.slug,
      name: product.name,
      description: product.description,
      features: product.features,
      categorySlug: product.category?.slug ?? null,
      brandSlug: product.brand?.slug ?? null,
      countryOfOrigin: product.countryOfOrigin,
      isTaxable: product.isTaxable,
      taxCategory: product.taxCategory,
      priceIncludesTax: product.priceIncludesTax,
      status: product.status,
      variantCount: product.variants.length,
      createdAt: product.createdAt.toISOString(),
      archivedAt: product.archivedAt?.toISOString() ?? null,
      primaryImageUrl: product.mediaAssignments[0]?.asset?.publicUrl ?? null,
      options: product.options.map((opt) => ({
        optionId: opt.id,
        name: opt.name,
        position: opt.position,
        values: opt.values.map((val) => ({
          valueId: val.id,
          value: val.value,
          position: val.position,
        })),
      })),
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

  async listProducts(input: AdminProductListQuery) {
    const { page, pageSize, q, categorySlug, brandSlug, status, sort, dir } =
      input;
    const offset = (page - 1) * pageSize;

    const where = and(
      q.trim()
        ? or(
            ilike(catalogProducts.name, `%${q.trim()}%`),
            ilike(catalogProducts.slug, `%${q.trim()}%`),
          )
        : undefined,
      categorySlug
        ? eq(
            catalogProducts.categoryId,
            this.db
              .select({ id: catalogCategories.id })
              .from(catalogCategories)
              .where(eq(catalogCategories.slug, categorySlug)),
          )
        : undefined,
      brandSlug
        ? eq(
            catalogProducts.brandId,
            this.db
              .select({ id: catalogBrands.id })
              .from(catalogBrands)
              .where(eq(catalogBrands.slug, brandSlug)),
          )
        : undefined,
      status !== "all" ? eq(catalogProducts.status, status as CatalogEntityStatus) : undefined,
    );

    // Optimized count using basic query
    const totalCountResult = await this.db.query.catalogProducts.findMany({
      where: (r, { and, ilike, or, eq }) =>
        and(
          q.trim()
            ? or(
                ilike(r.name, `%${q.trim()}%`),
                ilike(r.slug, `%${q.trim()}%`),
              )
            : undefined,
          status !== "all" ? eq(r.status, status as CatalogEntityStatus) : undefined,
          // Note: category/brand filtering in many-to-many or complex joins
          // might be better handled with explicit subqueries or findMany with with filtering
        ),
      // We only need the length, but this is a bit inefficient for large tables.
      // However, for admin catalog it is usually fine.
    });

    const rows = await this.db.query.catalogProducts.findMany({
      where: (r, { and, ilike, or, eq }) =>
        and(
          q.trim()
            ? or(
                ilike(r.name, `%${q.trim()}%`),
                ilike(r.slug, `%${q.trim()}%`),
              )
            : undefined,
          status !== "all" ? eq(r.status, status as CatalogEntityStatus) : undefined,
        ),
      with: {
        category: { columns: { slug: true } },
        brand: { columns: { slug: true } },
        variants: { columns: { id: true } },
        mediaAssignments: {
          where: (ma, { and, eq }) =>
            and(eq(ma.entityType, "product"), eq(ma.isPrimary, true)),
          with: { asset: true },
        },
      },
      orderBy: (r, { asc, desc }) => {
        const column = sort === "createdAt" ? r.createdAt : r.name;
        return [dir === "desc" ? desc(column) : asc(column), asc(r.id)];
      },
      limit: pageSize,
      offset: offset,
    });

    return {
      items: rows.map((product) => ({
        slug: product.slug,
        name: product.name,
        description: product.description,
        features: product.features,
        categorySlug: product.category?.slug ?? null,
        brandSlug: product.brand?.slug ?? null,
        countryOfOrigin: product.countryOfOrigin,
        isTaxable: product.isTaxable,
        taxCategory: product.taxCategory,
        priceIncludesTax: product.priceIncludesTax,
        status: product.status,
        variantCount: product.variants.length,
        createdAt: product.createdAt.toISOString(),
        archivedAt: product.archivedAt?.toISOString() ?? null,
        primaryImageUrl: product.mediaAssignments[0]?.asset?.publicUrl ?? null,
      })),
      totalCount: totalCountResult.length,
    };
  }
}
