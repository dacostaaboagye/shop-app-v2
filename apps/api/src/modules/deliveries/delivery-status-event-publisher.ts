import type { DeliveryStatus } from "@shop/contracts";
import type {
  PlatformEventPublisher,
  PlatformEventRecord,
} from "../events/platform-event.types.js";
import type { PlatformEventAppendDatabase } from "../events/postgres-platform-event.repository.js";
import { createDeliveryStatusChangedEvent } from "./delivery-status-events.js";

type DeliveryStatusEventLogger = {
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type DeliveryStatusEventPublisher = Pick<
  PlatformEventPublisher,
  "publish"
> & {
  appendWithinTransaction: (
    event: Parameters<PlatformEventPublisher["publish"]>[0],
    db: PlatformEventAppendDatabase,
  ) => Promise<void>;
  notifyAppendCommitted?: () => Promise<void>;
};

type DeliveryStatusEventInput = {
  logger?: DeliveryStatusEventLogger;
  deliveryId: string;
  fromStatus: DeliveryStatus;
  toStatus: DeliveryStatus;
  originLocationId: string;
  actorUserId: string;
  actorUserSlug: string;
  occurredAt: Date;
  cancellationReason?: string | null;
  assignedUserId?: string | null;
};

type DeliveryStatusEventTransaction = {
  appendPlatformEvent(
    event: PlatformEventRecord,
    publisher: DeliveryStatusEventPublisher,
  ): Promise<void>;
};

export async function appendStatusChangedEvent(input: {
  event: DeliveryStatusEventInput;
  publisher?: DeliveryStatusEventPublisher | undefined;
  tx: DeliveryStatusEventTransaction;
}): Promise<void> {
  if (!input.publisher) {
    return;
  }

  await input.tx.appendPlatformEvent(
    createDeliveryStatusChangedEvent(input.event),
    input.publisher,
  );
}

export async function appendDeliveryStatusChangedEvent(input: {
  db: PlatformEventAppendDatabase;
  event: PlatformEventRecord;
  publisher: DeliveryStatusEventPublisher;
}): Promise<void> {
  await input.publisher.appendWithinTransaction(input.event, input.db);
}

export async function notifyDeliveryStatusEventCommitted(input: {
  logger?: DeliveryStatusEventLogger | undefined;
  publisher?: DeliveryStatusEventPublisher | undefined;
  event: Pick<
    DeliveryStatusEventInput,
    "deliveryId" | "fromStatus" | "toStatus"
  >;
}): Promise<void> {
  if (!input.publisher?.notifyAppendCommitted) {
    return;
  }
  try {
    await input.publisher.notifyAppendCommitted();
  } catch (error) {
    input.logger?.error("[deliveries] Failed to publish status-change event", {
      deliveryId: input.event.deliveryId,
      error: error instanceof Error ? error.message : String(error),
      fromStatus: input.event.fromStatus,
      toStatus: input.event.toStatus,
    });
  }
}
