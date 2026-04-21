import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  productVariants,
  stockBalances,
  users,
} from "@shop/database";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "../catalog/catalog-primary-image.loader.js";
import {
  ACTIVE_OWNERSHIP_EVENT_TYPES,
  getLatestOwnershipEventsForLocation,
} from "../inventory-ownership/ownership-latest-event-query.js";
import {
  getLocationStaffRows,
  type LocationStaffRow,
} from "./postgres-location-staff-query.js";

export type WorkerAssignmentRow = {
  availableQuantity: number;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  effectiveFrom: Date;
  locationId: string;
  onHandQuantity: number;
  primaryImageUrl: string | null;
  productName: string;
  productSlug: string;
  quantity: number;
  sellingPrice: string;
  sku: string;
  skuId: string;
  variantName: string;
  variantSlug: string;
  workerId: string;
};

export type LocationAssignmentRow = {
  effectiveFrom: Date;
  eventType: string;
  productName: string;
  quantity: number;
  sku: string;
  skuId: string;
  variantName: string;
  workerEmail: string;
  workerId: string;
  workerName: string;
};

export class PostgresWorkerAssignmentQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getWorkerAssignments(input: {
    locationId: string;
    workerId: string;
  }): Promise<WorkerAssignmentRow[]> {
    const latestEvents = getLatestOwnershipEventsForLocation(
      this.db,
      input.locationId,
    );

    const rows = await this.db
      .select({
        effectiveFrom: latestEvents.effectiveFrom,
        eventType: latestEvents.eventType,
        brandName: catalogBrands.name,
        brandSlug: catalogBrands.slug,
        categoryName: catalogCategories.name,
        categorySlug: catalogCategories.slug,
        locationId: latestEvents.locationId,
        onHandQuantity: stockBalances.onHandQuantity,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        quantity: latestEvents.quantity,
        reservedQuantity: stockBalances.reservedQuantity,
        sellingPrice: productVariants.sellingPrice,
        sku: productVariants.sku,
        skuId: latestEvents.skuId,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
        workerId: latestEvents.workerId,
      })
      .from(latestEvents)
      .innerJoin(productVariants, eq(productVariants.id, latestEvents.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
      .leftJoin(
        catalogCategories,
        eq(catalogCategories.id, catalogProducts.categoryId),
      )
      .leftJoin(
        stockBalances,
        and(
          eq(stockBalances.skuId, latestEvents.skuId),
          eq(stockBalances.locationId, latestEvents.locationId),
        ),
      )
      .where(
        and(
          eq(latestEvents.workerId, input.workerId),
          inArray(latestEvents.eventType, ACTIVE_OWNERSHIP_EVENT_TYPES),
        ),
      )
      .orderBy(desc(latestEvents.effectiveFrom));

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "product",
      rows.map((row) => row.productSlug),
    );

    return rows.map((row) => ({
      availableQuantity: Math.max(
        Number(row.onHandQuantity ?? 0) - Number(row.reservedQuantity ?? 0),
        0,
      ),
      brandName: row.brandName,
      brandSlug: row.brandSlug,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      effectiveFrom: row.effectiveFrom,
      locationId: row.locationId,
      onHandQuantity: Number(row.onHandQuantity ?? 0),
      primaryImageUrl: primaryImageUrls.get(row.productSlug) ?? null,
      productName: row.productName,
      productSlug: row.productSlug,
      quantity: row.quantity,
      sellingPrice: row.sellingPrice,
      sku: row.sku,
      skuId: row.skuId,
      variantName: row.variantName,
      variantSlug: row.variantSlug,
      workerId: row.workerId,
    }));
  }

  async getLocationAssignments(
    locationId: string,
  ): Promise<LocationAssignmentRow[]> {
    const latestEvents = getLatestOwnershipEventsForLocation(
      this.db,
      locationId,
    );

    const rows = await this.db
      .select({
        effectiveFrom: latestEvents.effectiveFrom,
        eventType: latestEvents.eventType,
        firstName: users.firstName,
        lastName: users.lastName,
        productName: catalogProducts.name,
        quantity: latestEvents.quantity,
        sku: productVariants.sku,
        skuId: latestEvents.skuId,
        variantName: productVariants.name,
        workerEmail: users.email,
        workerId: latestEvents.workerId,
      })
      .from(latestEvents)
      .innerJoin(productVariants, eq(productVariants.id, latestEvents.skuId))
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(users, eq(users.id, latestEvents.workerId))
      .where(inArray(latestEvents.eventType, ACTIVE_OWNERSHIP_EVENT_TYPES))
      .orderBy(desc(latestEvents.effectiveFrom));

    return rows.map((row) => ({
      effectiveFrom: row.effectiveFrom,
      eventType: row.eventType,
      productName: row.productName,
      quantity: row.quantity,
      sku: row.sku,
      skuId: row.skuId,
      variantName: row.variantName,
      workerEmail: row.workerEmail,
      workerId: row.workerId,
      workerName: `${row.firstName} ${row.lastName}`.trim(),
    }));
  }

  async getLocationStaff(locationId: string): Promise<LocationStaffRow[]> {
    return getLocationStaffRows(this.db, locationId);
  }
}
