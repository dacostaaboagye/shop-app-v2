import { randomUUID } from "node:crypto";
import { locations, stockBalances, stockMovements } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import { StockBalanceAdjustmentConflictError } from "./stock-balance-adjustment.contracts.js";
import { createStockCountEvent } from "./stock-count-event.js";

export type AdminStockCountRequest = {
  locationSlug: string;
  onHandQuantity: number;
  sku: string;
};

export type AdminStockCountSummary = {
  availableQuantity: number;
  inTransitQuantity: number;
  locationName: string;
  locationSlug: string;
  onHandQuantity: number;
  productName: string;
  productSlug: string;
  reservedQuantity: number;
  sku: string;
  skuId: string;
  updatedAt: string;
  variantName: string;
  variantSlug: string;
};

export class AdminStockCountRepository {
  constructor(
    private readonly db: ApiDatabase,
    private readonly eventPublisher: Pick<
      PlatformEventPipelinePublisher,
      "appendWithinTransaction" | "notifyAppendCommitted"
    > | null = null,
  ) {}

  async setOnHandQuantity(
    input: AdminStockCountRequest & {
      countedBy?: string;
      countedBySlug?: string;
    },
  ): Promise<AdminStockCountSummary> {
    const { locationSlug, sku, onHandQuantity, countedBy, countedBySlug } =
      input;

    const result = await this.db.transaction(async (tx) => {
      // 1. Resolve Location
      const location = await tx.query.locations.findFirst({
        where: (l, { eq }) => eq(l.slug, locationSlug),
      });

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: `Location "${locationSlug}" was not found.`,
          statusCode: 404,
          title: "Location not found",
        });
      }

      // 2. Resolve Variant and Product
      const variant = await tx.query.productVariants.findFirst({
        where: (v, { eq }) => eq(v.sku, sku),
        with: {
          product: true,
        },
      });

      if (!variant || !variant.product) {
        throw new AppError({
          code: "not_found",
          detail: `SKU "${sku}" was not found or its product is missing.`,
          statusCode: 404,
          title: "SKU not found",
        });
      }

      // 3. Get existing balance for update
      const existingBalance = await tx
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.skuId, variant.id),
            eq(stockBalances.locationId, location.id),
          ),
        )
        .for("update")
        .then((rows) => rows[0]);

      const currentOnHand = existingBalance?.onHandQuantity ?? 0;
      const reserved = existingBalance?.reservedQuantity ?? 0;
      const delta = onHandQuantity - currentOnHand;
      const shouldPublishEvent = delta !== 0 && !!this.eventPublisher;

      if (onHandQuantity < reserved) {
        throw new StockBalanceAdjustmentConflictError({
          locationId: location.id,
          nextOnHandQuantity: onHandQuantity,
          quantityDelta: delta,
          reservedQuantity: reserved,
          skuId: variant.id,
        });
      }

      const now = new Date();

      if (!existingBalance) {
        await tx.insert(stockBalances).values({
          skuId: variant.id,
          locationId: location.id,
          onHandQuantity: onHandQuantity,
          reservedQuantity: 0,
          updatedBy: countedBy ?? null,
          createdAt: now,
          updatedAt: now,
        });
      } else if (delta !== 0) {
        await tx
          .update(stockBalances)
          .set({
            onHandQuantity: onHandQuantity,
            updatedAt: now,
            updatedBy: countedBy ?? null,
          })
          .where(eq(stockBalances.id, existingBalance.id));
      }

      if (delta !== 0) {
        await tx.insert(stockMovements).values({
          skuId: variant.id,
          locationId: location.id,
          movementType: "manual_adjustment",
          sourceType: "admin_count",
          sourceKey: randomUUID(),
          quantityDelta: delta,
          occurredAt: now,
          createdBy: countedBy ?? null,
          createdAt: now,
        });

        if (shouldPublishEvent) {
          await this.eventPublisher?.appendWithinTransaction(
            createStockCountEvent({
              actor: { userSlug: countedBySlug ?? "system" },
              countedAt: now,
              locationId: location.id,
              locationName: location.name,
              locationSlug: location.slug,
              nextOnHandQuantity: onHandQuantity,
              previousOnHandQuantity: currentOnHand,
              productName: variant.product.name,
              sku: variant.sku,
              skuId: variant.id,
              variantName: variant.name,
            }),
            tx,
          );
        }
      }

      return {
        eventAppended: shouldPublishEvent,
        summary: {
          availableQuantity: onHandQuantity - reserved,
          inTransitQuantity: 0,
          locationName: location.name,
          locationSlug,
          onHandQuantity,
          productName: variant.product.name,
          productSlug: variant.product.slug,
          reservedQuantity: reserved,
          sku: variant.sku,
          skuId: variant.id,
          updatedAt: now.toISOString(),
          variantName: variant.name,
          variantSlug: variant.slug,
        },
      };
    });

    if (result.eventAppended) {
      await this.eventPublisher?.notifyAppendCommitted();
    }
    return result.summary;
  }

  async findCountLocationBySlug(locationSlug: string): Promise<{
    id: string;
    name: string;
    slug: string;
  } | null> {
    const [location] = await this.db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
      })
      .from(locations)
      .where(eq(locations.slug, locationSlug))
      .limit(1);

    return location ?? null;
  }
}
