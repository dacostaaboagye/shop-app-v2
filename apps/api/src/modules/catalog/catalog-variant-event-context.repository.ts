import { catalogProducts, productVariants } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type CatalogVariantEventContext = {
  productSlug: string;
  sku: string;
  variantName: string;
  variantSlug: string;
};

export type CatalogVariantEventContextRepository = {
  getVariantEventContext(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<CatalogVariantEventContext | null>;
};

export class PostgresCatalogVariantEventContextRepository
  implements CatalogVariantEventContextRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getVariantEventContext(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<CatalogVariantEventContext | null> {
    const [row] = await this.db
      .select({
        productSlug: catalogProducts.slug,
        sku: productVariants.sku,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
      })
      .from(productVariants)
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .where(
        and(
          eq(catalogProducts.slug, input.productSlug),
          eq(productVariants.slug, input.variantSlug),
        ),
      );

    return row ?? null;
  }
}
