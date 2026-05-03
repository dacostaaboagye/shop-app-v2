import type { DeliveryStatus } from "@shop/contracts";
import { deliveries, deliveryItems } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { PlatformEventRecord } from "../events/platform-event.types.js";
import type { DeliveryRecord } from "./delivery.types.js";
import { mapDeliveryItemRow, mapDeliveryRow } from "./delivery-row-mapper.js";
import type { DeliveryStatusEventPublisher } from "./delivery-status-event-publisher.js";
import { appendDeliveryStatusChangedEvent } from "./delivery-status-event-publisher.js";

export type TransitionStatusInput = {
  deliveryId: string;
  expectedStatus: DeliveryStatus;
  nextStatus: DeliveryStatus;
  assignedUserId?: string;
  cancellationReason?: string;
  actorUserId: string;
  now: Date;
};

export interface DeliveryStatusWriteTransaction {
  findById(deliveryId: string): Promise<DeliveryRecord | null>;
  appendPlatformEvent(
    event: PlatformEventRecord,
    publisher: DeliveryStatusEventPublisher,
  ): Promise<void>;
  transitionStatus(
    input: TransitionStatusInput,
  ): Promise<DeliveryRecord | null>;
}

export interface DeliveryStatusWriteRepository {
  withTransaction<T>(
    callback: (transaction: DeliveryStatusWriteTransaction) => Promise<T>,
  ): Promise<T>;
}

export class PostgresDeliveryStatusWriteRepository
  implements DeliveryStatusWriteRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async withTransaction<T>(
    callback: (transaction: DeliveryStatusWriteTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) =>
      callback(createPostgresDeliveryStatusWriteTransaction(tx)),
    );
  }
}

export function createPostgresDeliveryStatusWriteTransaction(
  tx: ApiDatabase,
): DeliveryStatusWriteTransaction {
  return new PostgresDeliveryStatusWriteTransaction(tx);
}

class PostgresDeliveryStatusWriteTransaction
  implements DeliveryStatusWriteTransaction
{
  constructor(private readonly tx: ApiDatabase) {}

  async findById(deliveryId: string): Promise<DeliveryRecord | null> {
    const [deliveryRow] = await this.tx
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId));
    if (!deliveryRow) {
      return null;
    }
    const itemRows = await this.tx
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.deliveryId, deliveryRow.id));
    return mapDeliveryRow(deliveryRow, itemRows.map(mapDeliveryItemRow));
  }

  async appendPlatformEvent(
    event: PlatformEventRecord,
    publisher: DeliveryStatusEventPublisher,
  ): Promise<void> {
    await appendDeliveryStatusChangedEvent({
      db: this.tx,
      event,
      publisher,
    });
  }

  async transitionStatus(
    input: TransitionStatusInput,
  ): Promise<DeliveryRecord | null> {
    const setClause = buildSetClause(input);
    const [row] = await this.tx
      .update(deliveries)
      .set(setClause)
      .where(
        and(
          eq(deliveries.id, input.deliveryId),
          eq(deliveries.status, input.expectedStatus),
        ),
      )
      .returning();
    if (!row) {
      return null;
    }
    const itemRows = await this.tx
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.deliveryId, row.id));
    return mapDeliveryRow(row, itemRows.map(mapDeliveryItemRow));
  }
}

function buildSetClause(
  input: TransitionStatusInput,
): Partial<typeof deliveries.$inferInsert> {
  const setClause: Partial<typeof deliveries.$inferInsert> = {
    status: input.nextStatus,
    updatedAt: input.now,
  };
  if (input.nextStatus === "assigned") {
    setClause.assignedAt = input.now;
    setClause.assignedBy = input.actorUserId;
    if (input.assignedUserId) {
      setClause.assignedUserId = input.assignedUserId;
    }
  } else if (input.nextStatus === "in_transit") {
    setClause.dispatchedAt = input.now;
    setClause.dispatchedBy = input.actorUserId;
  } else if (input.nextStatus === "completed") {
    setClause.completedAt = input.now;
    setClause.completedBy = input.actorUserId;
  } else if (input.nextStatus === "cancelled") {
    setClause.cancelledAt = input.now;
    setClause.cancelledBy = input.actorUserId;
    setClause.cancellationReason = input.cancellationReason ?? null;
  }
  return setClause;
}
