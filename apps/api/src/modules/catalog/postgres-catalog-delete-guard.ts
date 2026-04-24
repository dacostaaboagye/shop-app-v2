import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
} from "@shop/database";
import { eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export class PostgresCatalogDeleteGuard {
  constructor(private readonly db: ApiDatabase) {}

  async assertBrandCanBeDeleted(brandSlug: string): Promise<void> {
    const brand = await this.db.query.catalogBrands.findFirst({
      where: eq(catalogBrands.slug, brandSlug),
      columns: { id: true },
    });

    if (!brand) return;

    const [productCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(catalogProducts)
      .where(eq(catalogProducts.brandId, brand.id));

    if ((productCount?.count ?? 0) > 0) {
      throw new AppError({
        code: "conflict",
        detail:
          "This brand has products associated with it and cannot be deleted. Remove or reassign the products first.",
        statusCode: 409,
        title: "Products prevent deletion",
      });
    }
  }

  async assertCategoryCanBeDeleted(categorySlug: string): Promise<void> {
    const category = await this.db.query.catalogCategories.findFirst({
      where: eq(catalogCategories.slug, categorySlug),
      columns: { id: true },
    });

    if (!category) return;

    const [productCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(catalogProducts)
      .where(eq(catalogProducts.categoryId, category.id));

    if ((productCount?.count ?? 0) > 0) {
      throw new AppError({
        code: "conflict",
        detail:
          "This category has products associated with it and cannot be deleted. Remove or reassign the products first.",
        statusCode: 409,
        title: "Products prevent deletion",
      });
    }

    const [childCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(catalogCategories)
      .where(eq(catalogCategories.parentCategoryId, category.id));

    if ((childCount?.count ?? 0) > 0) {
      throw new AppError({
        code: "conflict",
        detail:
          "This category has sub-categories and cannot be deleted. Delete or move the sub-categories first.",
        statusCode: 409,
        title: "Sub-categories prevent deletion",
      });
    }
  }
}
