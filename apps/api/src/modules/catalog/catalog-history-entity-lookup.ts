import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  productVariants,
} from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { CatalogChangeEntityType } from "../catalog-change-log/catalog-change-log.types.js";

export type CatalogHistoryEntityKind =
  | "catalog_product"
  | "product_variant"
  | "catalog_brand"
  | "catalog_category";

export interface CatalogHistoryEntityLookup {
  findIdBySlug(input: {
    kind: CatalogHistoryEntityKind;
    slug: string;
  }): Promise<string | null>;
}

export class PostgresCatalogHistoryEntityLookup
  implements CatalogHistoryEntityLookup
{
  constructor(private readonly db: ApiDatabase) {}

  async findIdBySlug(input: {
    kind: CatalogHistoryEntityKind;
    slug: string;
  }): Promise<string | null> {
    switch (input.kind) {
      case "catalog_product": {
        const rows = await this.db
          .select({ id: catalogProducts.id })
          .from(catalogProducts)
          .where(eq(catalogProducts.slug, input.slug))
          .limit(1);
        return rows[0]?.id ?? null;
      }
      case "product_variant": {
        const rows = await this.db
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(eq(productVariants.slug, input.slug))
          .limit(1);
        return rows[0]?.id ?? null;
      }
      case "catalog_brand": {
        const rows = await this.db
          .select({ id: catalogBrands.id })
          .from(catalogBrands)
          .where(eq(catalogBrands.slug, input.slug))
          .limit(1);
        return rows[0]?.id ?? null;
      }
      case "catalog_category": {
        const rows = await this.db
          .select({ id: catalogCategories.id })
          .from(catalogCategories)
          .where(eq(catalogCategories.slug, input.slug))
          .limit(1);
        return rows[0]?.id ?? null;
      }
    }
  }
}

export function entityKindToType(
  kind: CatalogHistoryEntityKind,
): CatalogChangeEntityType {
  return kind;
}
