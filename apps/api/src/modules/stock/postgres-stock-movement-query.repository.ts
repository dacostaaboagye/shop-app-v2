import type {
  AdminStockMovementQuery,
  ManagerStockMovementQuery,
  StockMovementSummary,
} from "@shop/contracts";
import {
  catalogProducts,
  locations,
  productVariants,
  stockMovements,
  users,
} from "@shop/database";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type StockMovementLocation = {
  id: string;
  name: string;
  slug: string;
};

export type StockMovementQueryRepository = {
  findLocationBySlug(slug: string): Promise<StockMovementLocation | null>;
  listStockMovements(input: AdminStockMovementQuery): Promise<{
    items: StockMovementSummary[];
    locationName: string | null;
    totalCount: number;
  }>;
  listStockMovementsForLocation(
    input: ManagerStockMovementQuery,
    location: StockMovementLocation,
  ): Promise<{
    items: StockMovementSummary[];
    locationName: string | null;
    totalCount: number;
  }>;
};

export class PostgresStockMovementQueryRepository
  implements StockMovementQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async findLocationBySlug(
    slug: string,
  ): Promise<StockMovementLocation | null> {
    const [location] = await this.db
      .select({ id: locations.id, name: locations.name, slug: locations.slug })
      .from(locations)
      .where(eq(locations.slug, slug))
      .limit(1);
    return location ?? null;
  }

  async listStockMovements(input: AdminStockMovementQuery) {
    const location = input.locationSlug
      ? await this.findLocationBySlug(input.locationSlug)
      : null;
    if (input.locationSlug && !location) {
      return { items: [], locationName: null, totalCount: 0 };
    }
    return this.listForScope(input, location);
  }

  async listStockMovementsForLocation(
    input: ManagerStockMovementQuery,
    location: StockMovementLocation,
  ) {
    return this.listForScope(input, location);
  }

  private async listForScope(
    input: AdminStockMovementQuery,
    location: StockMovementLocation | null,
  ) {
    const offset = (input.page - 1) * input.pageSize;
    const filter = buildMovementFilter(input, location);

    const [countResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(stockMovements)
      .innerJoin(locations, eq(locations.id, stockMovements.locationId))
      .innerJoin(productVariants, eq(productVariants.id, stockMovements.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .where(filter);

    const rows = await this.db
      .select({
        actorName: sql<
          string | null
        >`NULLIF(TRIM(CONCAT_WS(' ', ${users.firstName}, ${users.lastName})), '')`,
        actorUserSlug: users.slug,
        locationName: locations.name,
        locationSlug: locations.slug,
        movementId: stockMovements.id,
        movementType: stockMovements.movementType,
        note: stockMovements.note,
        occurredAt: stockMovements.occurredAt,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        quantityDelta: stockMovements.quantityDelta,
        reasonCode: stockMovements.reasonCode,
        sku: productVariants.sku,
        sourceKey: stockMovements.sourceKey,
        sourceType: stockMovements.sourceType,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
      })
      .from(stockMovements)
      .innerJoin(locations, eq(locations.id, stockMovements.locationId))
      .innerJoin(productVariants, eq(productVariants.id, stockMovements.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .leftJoin(users, eq(users.id, stockMovements.createdBy))
      .where(filter)
      .orderBy(desc(stockMovements.occurredAt), desc(stockMovements.id))
      .limit(input.pageSize)
      .offset(offset);

    return {
      items: rows.map(
        (row): StockMovementSummary => ({
          actorName: row.actorName ?? null,
          actorUserSlug: row.actorUserSlug ?? null,
          locationName: row.locationName,
          locationSlug: row.locationSlug,
          movementType: row.movementType,
          note: row.note ?? null,
          occurredAt: toIsoTimestamp(row.occurredAt),
          productName: row.productName,
          productSlug: row.productSlug,
          quantityDelta: row.quantityDelta,
          reasonCode: row.reasonCode ?? null,
          sku: row.sku,
          sourceReference: toSafeSourceReference(row.sourceType, row.sourceKey),
          sourceType: row.sourceType,
          variantName: row.variantName,
          variantSlug: row.variantSlug,
        }),
      ),
      locationName: location?.name ?? null,
      totalCount: countResult?.count ?? 0,
    };
  }
}

function buildMovementFilter(
  input: AdminStockMovementQuery,
  location: StockMovementLocation | null,
) {
  const query = input.q.trim();
  const sku = input.sku.trim();
  const pattern = `%${query}%`;
  const skuPattern = `%${sku}%`;
  const dateFrom = parseDateFrom(input.dateFrom);
  const dateTo = parseDateTo(input.dateTo);

  return and(
    location ? eq(stockMovements.locationId, location.id) : undefined,
    query
      ? or(
          ilike(catalogProducts.name, pattern),
          ilike(productVariants.name, pattern),
          ilike(productVariants.sku, pattern),
          ilike(stockMovements.sourceType, pattern),
          ilike(stockMovements.sourceKey, pattern),
        )
      : undefined,
    sku ? ilike(productVariants.sku, skuPattern) : undefined,
    input.movementType
      ? eq(stockMovements.movementType, input.movementType)
      : undefined,
    input.sourceType
      ? eq(stockMovements.sourceType, input.sourceType)
      : undefined,
    dateFrom ? gte(stockMovements.occurredAt, dateFrom) : undefined,
    dateTo ? lte(stockMovements.occurredAt, dateTo) : undefined,
  );
}

function parseDateFrom(value: string): Date | undefined {
  if (!value) return undefined;
  return new Date(isDateOnly(value) ? `${value}T00:00:00.000Z` : value);
}

function parseDateTo(value: string): Date | undefined {
  if (!value) return undefined;
  if (!isDateOnly(value)) return new Date(value);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999),
  );
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toSafeSourceReference(
  sourceType: string,
  sourceKey: string,
): string | null {
  switch (sourceType) {
    case "pos_return":
    case "pos_sale":
    case "stock_take":
    case "supplier_procurement_receipt":
      return prefixBeforeLineIdentity(sourceKey);
    case "opening_stock":
      return isPublicSafeReference(sourceKey) ? sourceKey : null;
    default:
      return null;
  }
}

function prefixBeforeLineIdentity(sourceKey: string): string | null {
  const [reference] = sourceKey.split(":");
  return reference && isPublicSafeReference(reference) ? reference : null;
}

function isPublicSafeReference(value: string): boolean {
  return value.length > 0 && !value.includes(":") && !isUuid(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
