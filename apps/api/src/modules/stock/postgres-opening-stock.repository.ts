import { randomUUID } from "node:crypto";
import type {
  AdminOpeningStockRequest,
  AdminOpeningStockResponse,
} from "@shop/contracts";
import {
  locations,
  stockBalanceInitializations,
  stockBalances,
  stockMovements,
} from "@shop/database";
import { and, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import {
  assertOpeningStockLinesReady,
  isOpeningStockUniqueViolation,
} from "./opening-stock-validation.js";
import { createStockCountEvent } from "./stock-count-event.js";
export class PostgresOpeningStockRepository {
  constructor(
    private readonly db: ApiDatabase,
    private readonly eventPublisher: Pick<
      PlatformEventPipelinePublisher,
      "appendWithinTransaction" | "notifyAppendCommitted"
    > | null = null,
  ) {}
  async initializeOpeningStock(
    input: AdminOpeningStockRequest & {
      initializedBy?: string;
      initializedBySlug?: string;
    },
  ): Promise<AdminOpeningStockResponse> {
    const sourceKey = input.sourceReference ?? randomUUID();
    const result = await this.db
      .transaction(async (tx) => {
        const location = await tx.query.locations.findFirst({
          where: (l, { eq }) => eq(l.slug, input.locationSlug),
        });

        if (!location) {
          throw new AppError({
            code: "not_found",
            detail: `Location "${input.locationSlug}" was not found.`,
            statusCode: 404,
            title: "Location not found",
          });
        }

        const skuList = input.lines.map((line) => line.sku);
        const variants = await tx.query.productVariants.findMany({
          where: (v, { and, eq, inArray }) =>
            and(inArray(v.sku, skuList), eq(v.status, "active")),
          with: { product: true },
        });
        const variantBySku = new Map(
          variants.map((variant) => [variant.sku, variant]),
        );
        const variantIds = variants.map((variant) => variant.id);
        const existingBalances =
          variantIds.length > 0
            ? await tx
                .select({
                  skuId: stockBalances.skuId,
                })
                .from(stockBalances)
                .where(
                  and(
                    eq(stockBalances.locationId, location.id),
                    inArray(stockBalances.skuId, variantIds),
                  ),
                )
                .for("update")
            : [];
        const existingInitializations =
          variantIds.length > 0
            ? await tx
                .select({
                  skuId: stockBalanceInitializations.skuId,
                })
                .from(stockBalanceInitializations)
                .where(
                  and(
                    eq(stockBalanceInitializations.locationId, location.id),
                    inArray(stockBalanceInitializations.skuId, variantIds),
                  ),
                )
            : [];

        assertOpeningStockLinesReady({
          existingBalanceSkuIds: new Set(
            existingBalances.map((balance) => balance.skuId),
          ),
          existingInitializationSkuIds: new Set(
            existingInitializations.map(
              (initialization) => initialization.skuId,
            ),
          ),
          lines: input.lines,
          variantBySku,
        });

        const now = new Date();
        const preparedLines = input.lines.map((line) => {
          const variant = variantBySku.get(line.sku);
          if (!variant || !variant.product) {
            throw new Error(
              "Opening stock line validation did not resolve SKU.",
            );
          }
          return { line, variant };
        });

        await tx.insert(stockBalanceInitializations).values(
          preparedLines.map(({ line, variant }) => ({
            createdAt: now,
            initializedAt: now,
            initializedBy: input.initializedBy ?? null,
            locationId: location.id,
            note: line.note ?? input.note ?? null,
            openingQuantity: line.onHandQuantity,
            skuId: variant.id,
            sourceKey,
            sourceType: input.sourceType,
          })),
        );

        await tx.insert(stockBalances).values(
          preparedLines.map(({ line, variant }) => ({
            createdAt: now,
            locationId: location.id,
            onHandQuantity: line.onHandQuantity,
            reservedQuantity: 0,
            skuId: variant.id,
            updatedAt: now,
            updatedBy: input.initializedBy ?? null,
          })),
        );

        const movementLines = preparedLines.filter(
          ({ line }) => line.onHandQuantity > 0,
        );
        if (movementLines.length > 0) {
          await tx.insert(stockMovements).values(
            movementLines.map(({ line, variant }) => ({
              createdAt: now,
              createdBy: input.initializedBy ?? null,
              locationId: location.id,
              movementType: "manual_adjustment" as const,
              note: line.note ?? input.note ?? null,
              occurredAt: now,
              quantityDelta: line.onHandQuantity,
              reasonCode: "opening_count" as const,
              skuId: variant.id,
              sourceKey,
              sourceType: "opening_stock",
            })),
          );
        }

        if (this.eventPublisher) {
          for (const { line, variant } of movementLines) {
            await this.eventPublisher.appendWithinTransaction(
              createStockCountEvent({
                actor: { userSlug: input.initializedBySlug ?? "system" },
                countedAt: now,
                locationId: location.id,
                locationName: location.name,
                locationSlug: location.slug,
                nextOnHandQuantity: line.onHandQuantity,
                note: line.note ?? input.note ?? null,
                previousOnHandQuantity: 0,
                productName: variant.product?.name ?? "Unknown product",
                reasonCode: "opening_count",
                sku: variant.sku,
                skuId: variant.id,
                variantName: variant.name,
              }),
              tx,
            );
          }
        }

        return {
          eventAppended: movementLines.length > 0 && !!this.eventPublisher,
          response: {
            initializedCount: preparedLines.length,
            items: preparedLines.map(({ line, variant }) => ({
              availableQuantity: line.onHandQuantity,
              inTransitQuantity: 0,
              locationName: location.name,
              locationSlug: location.slug,
              note: line.note ?? input.note ?? null,
              onHandQuantity: line.onHandQuantity,
              openingQuantity: line.onHandQuantity,
              productName: variant.product?.name ?? "Unknown product",
              productSlug: variant.product?.slug ?? "",
              reservedQuantity: 0,
              sku: variant.sku,
              updatedAt: now.toISOString(),
              variantName: variant.name,
              variantSlug: variant.slug,
            })),
            locationName: location.name,
            locationSlug: location.slug,
            sourceKey,
            sourceType: input.sourceType,
          },
        };
      })
      .catch((error: unknown) => {
        if (error instanceof AppError) throw error;
        if (isOpeningStockUniqueViolation(error)) {
          throw new AppError({
            code: "conflict",
            detail:
              "One or more SKU/location pairs were initialized by another request. Refresh stock levels and retry only unresolved rows.",
            statusCode: 409,
            title: "Opening stock already initialized",
          });
        }

        throw error;
      });

    if (result.eventAppended) {
      await this.eventPublisher?.notifyAppendCommitted();
    }

    return result.response;
  }
  async findOpeningLocationBySlug(locationSlug: string): Promise<{
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
