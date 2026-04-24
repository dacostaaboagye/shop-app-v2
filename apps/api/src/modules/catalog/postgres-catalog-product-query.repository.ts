import type {
  AdminProductDetail,
  AdminProductListQuery,
  CatalogEntityStatus,
} from "@shop/contracts";
import { catalogProducts } from "@shop/database";
import { and, eq, ilike, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import {
  getPrimaryImageUrl,
  listPrimaryImageUrls,
} from "./catalog-primary-image.loader.js";
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

    const primaryImageUrl = await getPrimaryImageUrl(
      this.db,
      "product",
      product.slug,
    );

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
      primaryImageUrl,
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

    const [categoryId, brandId] = await Promise.all([
      categorySlug
        ? this.getCategoryIdBySlug(categorySlug)
        : Promise.resolve(null),
      brandSlug ? this.getBrandIdBySlug(brandSlug) : Promise.resolve(null),
    ]);

    if ((categorySlug && !categoryId) || (brandSlug && !brandId)) {
      return {
        items: [],
        totalCount: 0,
      };
    }

    const where = and(
      q.trim()
        ? or(
            ilike(catalogProducts.name, `%${q.trim()}%`),
            ilike(catalogProducts.slug, `%${q.trim()}%`),
          )
        : undefined,
      categoryId ? eq(catalogProducts.categoryId, categoryId) : undefined,
      brandId ? eq(catalogProducts.brandId, brandId) : undefined,
      status !== "all"
        ? eq(catalogProducts.status, status as CatalogEntityStatus)
        : undefined,
    );

    const totalCountResult = await this.db.query.catalogProducts.findMany({
      where,
    });

    const rows = await this.db.query.catalogProducts.findMany({
      where,
      with: {
        category: { columns: { slug: true } },
        brand: { columns: { slug: true } },
        variants: { columns: { id: true } },
      },
      orderBy: (r, { asc, desc }) => {
        const column = sort === "createdAt" ? r.createdAt : r.name;
        return [dir === "desc" ? desc(column) : asc(column), asc(r.id)];
      },
      limit: pageSize,
      offset: offset,
    });

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "product",
      rows.map((product) => product.slug),
    );

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
        primaryImageUrl: primaryImageUrls.get(product.slug) ?? null,
      })),
      totalCount: totalCountResult.length,
    };
  }

  private async getBrandIdBySlug(slug: string): Promise<string | null> {
    const brand = await this.db.query.catalogBrands.findFirst({
      columns: { id: true },
      where: (r, { eq }) => eq(r.slug, slug),
    });

    return brand?.id ?? null;
  }

  private async getCategoryIdBySlug(slug: string): Promise<string | null> {
    const category = await this.db.query.catalogCategories.findFirst({
      columns: { id: true },
      where: (r, { eq }) => eq(r.slug, slug),
    });

    return category?.id ?? null;
  }
}
