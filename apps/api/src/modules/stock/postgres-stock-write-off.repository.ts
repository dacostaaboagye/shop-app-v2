import { randomUUID } from "node:crypto";
import type {
  StockWriteOffRequest,
  StockWriteOffResponse,
} from "@shop/contracts";
import { stockBalances, stockMovements } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";

type LocationScope = {
  id: string;
  name: string;
  slug: string;
};

export class PostgresStockWriteOffRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findLocationBySlug(slug: string): Promise<LocationScope | null> {
    const row = await this.db.query.locations.findFirst({
      columns: { id: true, name: true, slug: true },
      where: (location, { and, eq }) =>
        and(eq(location.slug, slug), eq(location.status, "active")),
    });

    return row ?? null;
  }

  async writeOffStock(
    input: StockWriteOffRequest & {
      actorUserId?: string | undefined;
    },
  ): Promise<StockWriteOffResponse> {
    return this.db.transaction(async (tx) => {
      const location = await tx.query.locations.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.slug, input.locationSlug), eq(row.status, "active")),
      });

      if (!location) {
        throw new AppError({
          code: "not_found",
          detail: "The selected stock location could not be found.",
          statusCode: 404,
          title: "Location not found",
        });
      }

      const variant = await tx.query.productVariants.findFirst({
        where: (row, { and, eq }) =>
          and(eq(row.sku, input.sku), eq(row.status, "active")),
        with: { product: true },
      });

      if (!variant?.product) {
        throw new AppError({
          code: "not_found",
          detail: `SKU "${input.sku}" was not found or is not active.`,
          statusCode: 404,
          title: "SKU not found",
        });
      }

      const balance = await tx
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

      if (!balance) {
        throw new AppError({
          code: "not_found",
          detail: "No stock balance exists for this SKU and location.",
          statusCode: 404,
          title: "Stock balance not found",
        });
      }

      const nextOnHandQuantity = balance.onHandQuantity - input.quantity;

      if (nextOnHandQuantity < balance.reservedQuantity) {
        throw new AppError({
          code: "conflict",
          detail:
            "This write-off would reduce on-hand stock below the reserved quantity.",
          details: {
            attemptedQuantity: input.quantity,
            currentOnHandQuantity: balance.onHandQuantity,
            reservedQuantity: balance.reservedQuantity,
          },
          statusCode: 409,
          title: "Write-off blocked",
        });
      }

      const now = new Date();
      await tx
        .update(stockBalances)
        .set({
          onHandQuantity: nextOnHandQuantity,
          updatedAt: now,
          updatedBy: input.actorUserId ?? null,
        })
        .where(eq(stockBalances.id, balance.id));

      await tx.insert(stockMovements).values({
        createdAt: now,
        createdBy: input.actorUserId ?? null,
        locationId: location.id,
        movementType: "manual_adjustment",
        note: input.note,
        occurredAt: now,
        quantityDelta: -input.quantity,
        reasonCode: input.reasonCode,
        skuId: variant.id,
        sourceKey: randomUUID(),
        sourceType: "stock_write_off",
      });

      return {
        availableQuantity: nextOnHandQuantity - balance.reservedQuantity,
        locationName: location.name,
        locationSlug: location.slug,
        note: input.note,
        onHandQuantity: nextOnHandQuantity,
        previousOnHandQuantity: balance.onHandQuantity,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        quantityDelta: -input.quantity,
        reasonCode: input.reasonCode,
        reservedQuantity: balance.reservedQuantity,
        sku: variant.sku,
        updatedAt: now.toISOString(),
        variantName: variant.name,
        variantSlug: variant.slug,
      };
    });
  }
}
