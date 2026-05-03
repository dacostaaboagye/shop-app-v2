import { deliveries, deliveryItems } from "@shop/database";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { DeliveryRecord } from "./delivery.types.js";
import type {
  DeliveryListFilters,
  DeliveryQueryService,
  ListByAgentInput,
  ListByLocationInput,
} from "./delivery-query.contracts.js";
import {
  DELIVERY_ACTIVE_AGENT_STATUSES,
  DELIVERY_QUERY_DEFAULT_LIMIT,
  DELIVERY_QUERY_MAX_LIMIT,
} from "./delivery-query.contracts.js";
import { mapDeliveryItemRow, mapDeliveryRow } from "./delivery-row-mapper.js";

export class PostgresDeliveryQueryRepository implements DeliveryQueryService {
  constructor(private readonly db: ApiDatabase) {}

  async findById(deliveryId: string): Promise<DeliveryRecord | null> {
    const [row] = await this.db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId));
    if (!row) {
      return null;
    }
    const itemRows = await this.db
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.deliveryId, row.id));
    return mapDeliveryRow(row, itemRows.map(mapDeliveryItemRow));
  }

  async listByAgent(input: ListByAgentInput): Promise<DeliveryRecord[]> {
    const statuses = resolveActiveAgentStatuses(input.filters);
    if (statuses.length === 0) {
      return [];
    }
    const limit = clampDeliveryListLimit(input.filters);
    const conditions = [eq(deliveries.assignedUserId, input.agentUserId)];
    conditions.push(inArray(deliveries.status, statuses));
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(and(...conditions))
      .orderBy(desc(deliveries.createdAt))
      .limit(limit);
    return this.attachItems(rows);
  }

  async listByLocation(input: ListByLocationInput): Promise<DeliveryRecord[]> {
    const limit = clampDeliveryListLimit(input.filters);
    const conditions = [eq(deliveries.originLocationId, input.locationId)];
    if (input.filters?.status?.length) {
      conditions.push(inArray(deliveries.status, input.filters.status));
    }
    const rows = await this.db
      .select()
      .from(deliveries)
      .where(and(...conditions))
      .orderBy(desc(deliveries.createdAt))
      .limit(limit);
    return this.attachItems(rows);
  }

  async hasSkuHistory(skuId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(deliveryItems)
      .where(eq(deliveryItems.skuId, skuId));

    return Boolean(row && row.count > 0);
  }

  private async attachItems(
    rows: Array<typeof deliveries.$inferSelect>,
  ): Promise<DeliveryRecord[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const allItems = await this.db
      .select()
      .from(deliveryItems)
      .where(inArray(deliveryItems.deliveryId, ids));
    const byDelivery = new Map<
      string,
      ReturnType<typeof mapDeliveryItemRow>[]
    >();
    for (const item of allItems) {
      const list = byDelivery.get(item.deliveryId) ?? [];
      list.push(mapDeliveryItemRow(item));
      byDelivery.set(item.deliveryId, list);
    }
    return rows.map((row) => mapDeliveryRow(row, byDelivery.get(row.id) ?? []));
  }
}

export function clampDeliveryListLimit(
  filters: DeliveryListFilters | undefined,
): number {
  const requested = filters?.limit ?? DELIVERY_QUERY_DEFAULT_LIMIT;
  if (requested <= 0) {
    return DELIVERY_QUERY_DEFAULT_LIMIT;
  }
  return Math.min(requested, DELIVERY_QUERY_MAX_LIMIT);
}

export function resolveActiveAgentStatuses(
  filters: DeliveryListFilters | undefined,
) {
  if (!filters?.status?.length) {
    return DELIVERY_ACTIVE_AGENT_STATUSES;
  }

  return filters.status.filter((status) =>
    DELIVERY_ACTIVE_AGENT_STATUSES.includes(status),
  );
}
