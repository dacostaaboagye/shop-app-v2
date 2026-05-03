import type { DeliverySourceType } from "@shop/contracts";
import { deliveries, deliveryItems } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type {
  DeliveryDestinationRecord,
  DeliveryItemRecord,
  DeliveryRecord,
} from "./delivery.types.js";
import { mapDeliveryItemRow, mapDeliveryRow } from "./delivery-row-mapper.js";

export type InsertDeliveryInput = {
  sourceType: DeliverySourceType;
  sourceReference: string;
  originLocationId: string;
  destination: DeliveryDestinationRecord;
  createdBy: string;
  createdAt: Date;
};

export type InsertDeliveryItemInput = {
  deliveryId: string;
  skuId: string;
  quantity: number;
  itemReference: string;
  createdAt: Date;
};

export interface DeliveryWriteTransaction {
  findExistingBySource(input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
  }): Promise<DeliveryRecord | null>;
  insertDelivery(input: InsertDeliveryInput): Promise<DeliveryRecord>;
  insertDeliveryItem(
    input: InsertDeliveryItemInput,
  ): Promise<DeliveryItemRecord>;
}

export interface DeliveryWriteRepository {
  withTransaction<T>(
    callback: (transaction: DeliveryWriteTransaction) => Promise<T>,
  ): Promise<T>;
}

export class PostgresDeliveryWriteRepository
  implements DeliveryWriteRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async withTransaction<T>(
    callback: (transaction: DeliveryWriteTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      return callback(createPostgresDeliveryWriteTransaction(tx));
    });
  }
}

export function createPostgresDeliveryWriteTransaction(
  tx: ApiDatabase,
): DeliveryWriteTransaction {
  return new PostgresDeliveryWriteTransaction(tx);
}

class PostgresDeliveryWriteTransaction implements DeliveryWriteTransaction {
  constructor(private readonly tx: ApiDatabase) {}

  async findExistingBySource(input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
  }): Promise<DeliveryRecord | null> {
    const [deliveryRow] = await this.tx
      .select()
      .from(deliveries)
      .where(
        and(
          eq(deliveries.sourceType, input.sourceType),
          eq(deliveries.sourceReference, input.sourceReference),
        ),
      );
    if (!deliveryRow) {
      return null;
    }

    const itemRows = await this.tx
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.deliveryId, deliveryRow.id));

    return mapDeliveryRow(deliveryRow, itemRows.map(mapDeliveryItemRow));
  }

  async insertDelivery(input: InsertDeliveryInput): Promise<DeliveryRecord> {
    const [row] = await this.tx
      .insert(deliveries)
      .values({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        originLocationId: input.originLocationId,
        destinationLocationId:
          input.destination.kind === "location"
            ? input.destination.locationId
            : null,
        destinationKind: input.destination.kind,
        destinationSnapshot:
          input.destination.kind === "external"
            ? input.destination.snapshot
            : null,
        status: "draft",
        createdBy: input.createdBy,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to insert delivery row.");
    }
    return mapDeliveryRow(row, []);
  }

  async insertDeliveryItem(
    input: InsertDeliveryItemInput,
  ): Promise<DeliveryItemRecord> {
    const [row] = await this.tx
      .insert(deliveryItems)
      .values({
        deliveryId: input.deliveryId,
        skuId: input.skuId,
        quantity: input.quantity,
        itemReference: input.itemReference,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to insert delivery item row.");
    }
    return mapDeliveryItemRow(row);
  }
}
