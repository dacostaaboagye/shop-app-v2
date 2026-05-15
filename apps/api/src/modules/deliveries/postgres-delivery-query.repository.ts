import { deliveries, deliveryItems } from "@shop/database";
import { and, eq, inArray, sql } from "drizzle-orm";
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
import {
  attachItems,
  loadDeliveryRecordById,
  loadDeliveryRecordByReference,
  selectDeliveryRows,
} from "./delivery-record-hydration.js";

export class PostgresDeliveryQueryRepository implements DeliveryQueryService {
  constructor(private readonly db: ApiDatabase) {}

  async findById(deliveryId: string): Promise<DeliveryRecord | null> {
    return loadDeliveryRecordById(this.db, deliveryId);
  }

  async findByReference(reference: string): Promise<DeliveryRecord | null> {
    return loadDeliveryRecordByReference(this.db, reference);
  }

  async listByAgent(input: ListByAgentInput): Promise<DeliveryRecord[]> {
    const statuses = resolveActiveAgentStatuses(input.filters);
    if (statuses.length === 0) {
      return [];
    }
    const limit = clampDeliveryListLimit(input.filters);
    const conditions = [eq(deliveries.assignedUserId, input.agentUserId)];
    conditions.push(inArray(deliveries.status, statuses));
    const where = and(...conditions);
    if (!where) {
      return [];
    }
    const rows = await selectDeliveryRows(this.db, where, {
      limit,
      orderByCreatedAtDesc: true,
    });
    return attachItems(this.db, rows);
  }

  async listByLocation(input: ListByLocationInput): Promise<DeliveryRecord[]> {
    const limit = clampDeliveryListLimit(input.filters);
    const conditions = [eq(deliveries.originLocationId, input.locationId)];
    if (input.filters?.status?.length) {
      conditions.push(inArray(deliveries.status, input.filters.status));
    }
    const where = and(...conditions);
    if (!where) {
      return [];
    }
    const rows = await selectDeliveryRows(this.db, where, {
      limit,
      orderByCreatedAtDesc: true,
    });
    return attachItems(this.db, rows);
  }

  async hasSkuHistory(skuId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(deliveryItems)
      .where(eq(deliveryItems.skuId, skuId));

    return Boolean(row && row.count > 0);
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
