import { deliveries, deliveryItems } from "@shop/database";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { DeliveryRecord } from "./delivery.types.js";
import type {
  DeliveryListFilters,
  DeliveryQueryService,
  ListByAgentInput,
  ListByLocationInput,
} from "./delivery-query.contracts.js";
import { mapDeliveryItemRow, mapDeliveryRow } from "./delivery-row-mapper.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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
    const limit = clampLimit(input.filters);
    const conditions = [eq(deliveries.assignedUserId, input.agentUserId)];
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

  async listByLocation(input: ListByLocationInput): Promise<DeliveryRecord[]> {
    const limit = clampLimit(input.filters);
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

function clampLimit(filters: DeliveryListFilters | undefined): number {
  const requested = filters?.limit ?? DEFAULT_LIMIT;
  if (requested <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(requested, MAX_LIMIT);
}
