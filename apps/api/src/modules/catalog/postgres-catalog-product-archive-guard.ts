import {
  catalogProducts,
  productVariants,
  stockBalances,
  stockReservations,
} from "@shop/database";
import { and, eq, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export class PostgresCatalogProductArchiveGuard {
  constructor(private readonly db: ApiDatabase) {}

  async assertVariantCanBeArchived(variantSlug: string): Promise<void> {
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(productVariants.slug, variantSlug),
      columns: { id: true },
    });

    if (!variant) return;

    await this.assertNoActiveStock(variant.id, "variant");
  }

  async assertProductCanBeArchived(productSlug: string): Promise<void> {
    const variants = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .where(
        and(
          eq(catalogProducts.slug, productSlug),
          eq(productVariants.status, "active"),
        ),
      );

    for (const { id } of variants) {
      await this.assertNoActiveStock(id, "product");
    }
  }

  private async assertNoActiveStock(
    variantId: string,
    entity: "variant" | "product",
  ): Promise<void> {
    const [balance] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.skuId, variantId),
          or(
            sql`${stockBalances.onHandQuantity} > 0`,
            sql`${stockBalances.reservedQuantity} > 0`,
          ),
        ),
      );

    if ((balance?.count ?? 0) > 0) {
      throw new AppError({
        code: "conflict",
        detail:
          entity === "variant"
            ? "This variant has active stock and cannot be archived. Adjust stock to zero first."
            : "One or more variants of this product have active stock and cannot be archived.",
        statusCode: 409,
        title: "Active stock prevents archiving",
      });
    }

    const [reservation] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.skuId, variantId),
          eq(stockReservations.status, "active"),
        ),
      );

    if ((reservation?.count ?? 0) > 0) {
      throw new AppError({
        code: "conflict",
        detail:
          entity === "variant"
            ? "This variant has active stock reservations and cannot be archived."
            : "One or more variants of this product have active reservations and cannot be archived.",
        statusCode: 409,
        title: "Active reservations prevent archiving",
      });
    }
  }
}
