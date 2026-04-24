import {
  catalogProducts,
  deliveryItems,
  stockBalances,
  stockOwnershipEvents,
  stockReservations,
} from "@shop/database";
import { and, eq, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

export class PostgresCatalogProductDeleteGuard {
  constructor(private readonly db: ApiDatabase) {}

  /**
   * Asserts that a product and all its variants can be safely deleted.
   * Deletion is blocked if any variant has:
   * 1. Active stock (on-hand or reserved)
   * 2. Active reservations
   * 3. Historical associations with deliveries
   * 4. Historical associations with inventory ownership events
   */
  async assertCanDeleteProduct(productSlug: string): Promise<void> {
    const product = await this.db.query.catalogProducts.findFirst({
      where: eq(catalogProducts.slug, productSlug),
      columns: { id: true, name: true },
      with: {
        variants: {
          columns: { id: true, sku: true, slug: true },
        },
      },
    });

    if (!product) return;

    for (const variant of product.variants ?? []) {
      await this.assertCanDeleteVariant(variant.id, variant.sku);
    }
  }

  /**
   * Asserts that a specific variant can be safely deleted.
   */
  async assertCanDeleteVariant(variantId: string, sku: string): Promise<void> {
    // 1. Check for Active Stock
    const [row] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
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

    if (row && row.count > 0) {
      throw new AppError({
        code: "conflict",
        detail: `Variant "${sku}" has active stock and cannot be deleted. Adjust stock to zero first.`,
        statusCode: 409,
        title: "Active stock prevents deletion",
      });
    }

    // 2. Check for Active Reservations
    const [resRow] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockReservations)
      .where(
        and(
          eq(stockReservations.skuId, variantId),
          eq(stockReservations.status, "active"),
        ),
      );

    if (resRow && resRow.count > 0) {
      throw new AppError({
        code: "conflict",
        detail: `Variant "${sku}" has active stock reservations and cannot be deleted.`,
        statusCode: 409,
        title: "Active reservations prevent deletion",
      });
    }

    // 3. Check for Delivery History (Historical Order Data)
    const [delRow] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(deliveryItems)
      .where(eq(deliveryItems.skuId, variantId));

    if (delRow && delRow.count > 0) {
      throw new AppError({
        code: "conflict",
        detail: `Variant "${sku}" is associated with delivery records and cannot be deleted to preserve audit history.`,
        statusCode: 409,
        title: "Delivery history prevents deletion",
      });
    }

    // 4. Check for Inventory Ownership History
    const [ownRow] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockOwnershipEvents)
      .where(eq(stockOwnershipEvents.skuId, variantId));

    if (ownRow && ownRow.count > 0) {
      throw new AppError({
        code: "conflict",
        detail: `Variant "${sku}" has inventory ownership history and cannot be deleted.`,
        statusCode: 409,
        title: "Ownership history prevents deletion",
      });
    }
  }
}
