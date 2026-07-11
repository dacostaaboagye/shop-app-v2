import {
  catalogProducts,
  locations,
  productVariants,
  stockOwnershipEvents,
  users,
} from "@shop/database";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { ACTIVE_OWNERSHIP_EVENT_TYPES } from "../inventory-ownership/ownership-latest-event-query.js";

const workerUsers = alias(users, "assignment_history_workers");
const actorUsers = alias(users, "assignment_history_actors");

export type AssignmentHistoryEventRow = {
  actorName: string;
  actorSlug: string;
  createdAt: Date;
  effectiveFrom: Date;
  eventType:
    | "assigned"
    | "reassigned"
    | "handover_out"
    | "handover_in"
    | "reverted"
    | "cancelled";
  handoverChainId: string | null;
  quantity: number;
  workerName: string;
  workerSlug: string;
};

export type AssignmentHistoryRow = {
  items: AssignmentHistoryEventRow[];
  locationId: string;
  locationName: string;
  locationSlug: string;
  productName: string;
  productSlug: string;
  sku: string;
  skuId: string;
  variantName: string;
  variantSlug: string;
};

export class PostgresAssignmentHistoryQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getAssignmentHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<AssignmentHistoryRow | null> {
    return this.loadHistory(input);
  }

  async getWorkerAssignmentHistory(input: {
    locationId: string;
    skuId: string;
    workerId: string;
  }): Promise<AssignmentHistoryRow | null> {
    const currentWorkerId = await this.getCurrentActiveWorkerId(input);
    if (currentWorkerId !== input.workerId) {
      return null;
    }
    return this.loadHistory(input);
  }

  private async getCurrentActiveWorkerId(input: {
    locationId: string;
    skuId: string;
  }): Promise<string | null> {
    const rows = await this.db
      .select({
        eventType: stockOwnershipEvents.eventType,
        workerId: stockOwnershipEvents.workerId,
      })
      .from(stockOwnershipEvents)
      .where(
        and(
          eq(stockOwnershipEvents.locationId, input.locationId),
          eq(stockOwnershipEvents.skuId, input.skuId),
        ),
      )
      .orderBy(
        desc(stockOwnershipEvents.effectiveFrom),
        desc(stockOwnershipEvents.createdAt),
        desc(stockOwnershipEvents.id),
      )
      .limit(1);

    const latest = rows[0];
    if (
      !latest ||
      !ACTIVE_OWNERSHIP_EVENT_TYPES.some(
        (eventType) => eventType === latest.eventType,
      )
    ) {
      return null;
    }
    return latest.workerId;
  }

  private async loadHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<AssignmentHistoryRow | null> {
    const rows = await this.db
      .select({
        actorFirstName: actorUsers.firstName,
        actorLastName: actorUsers.lastName,
        actorSlug: actorUsers.slug,
        createdAt: stockOwnershipEvents.createdAt,
        effectiveFrom: stockOwnershipEvents.effectiveFrom,
        eventType: stockOwnershipEvents.eventType,
        handoverChainId: stockOwnershipEvents.handoverChainId,
        locationId: locations.id,
        locationName: locations.name,
        locationSlug: locations.slug,
        productName: catalogProducts.name,
        productSlug: catalogProducts.slug,
        quantity: stockOwnershipEvents.quantity,
        sku: productVariants.sku,
        skuId: productVariants.id,
        variantName: productVariants.name,
        variantSlug: productVariants.slug,
        workerFirstName: workerUsers.firstName,
        workerLastName: workerUsers.lastName,
        workerSlug: workerUsers.slug,
      })
      .from(stockOwnershipEvents)
      .innerJoin(
        productVariants,
        eq(productVariants.id, stockOwnershipEvents.skuId),
      )
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, stockOwnershipEvents.locationId))
      .innerJoin(workerUsers, eq(workerUsers.id, stockOwnershipEvents.workerId))
      .innerJoin(actorUsers, eq(actorUsers.id, stockOwnershipEvents.createdBy))
      .where(
        and(
          eq(stockOwnershipEvents.locationId, input.locationId),
          eq(stockOwnershipEvents.skuId, input.skuId),
        ),
      )
      .orderBy(
        asc(stockOwnershipEvents.effectiveFrom),
        asc(stockOwnershipEvents.createdAt),
        asc(stockOwnershipEvents.id),
      );

    const first = rows[0];
    if (!first) {
      return null;
    }

    return {
      items: rows.map((row) => ({
        actorName: fullName(row.actorFirstName, row.actorLastName),
        actorSlug: row.actorSlug,
        createdAt: row.createdAt,
        effectiveFrom: row.effectiveFrom,
        eventType: row.eventType,
        handoverChainId: row.handoverChainId,
        quantity: row.quantity,
        workerName: fullName(row.workerFirstName, row.workerLastName),
        workerSlug: row.workerSlug,
      })),
      locationId: first.locationId,
      locationName: first.locationName,
      locationSlug: first.locationSlug,
      productName: first.productName,
      productSlug: first.productSlug,
      sku: first.sku,
      skuId: first.skuId,
      variantName: first.variantName,
      variantSlug: first.variantSlug,
    };
  }
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
