import type {
  PlatformEventPublisher,
  PlatformEventRecord,
} from "./platform-event.types.js";
import type { ClaimedPlatformEvent } from "./postgres-platform-event.repository.js";

type EventDeliveryLogger = {
  error: (details: object, message: string) => void;
  warn: (details: object, message: string) => void;
};

type PlatformEventDeliveryDependencies = {
  eventLogRepository: {
    claimPendingBatch(input: {
      limit: number;
      now: Date;
      staleProcessingBefore: Date;
    }): Promise<ClaimedPlatformEvent[]>;
    markDelivered(input: { eventId: string; now: Date }): Promise<void>;
    markFailed(input: {
      eventId: string;
      lastError: string;
      nextAvailableAt: Date;
      terminal: boolean;
    }): Promise<void>;
  };
  livePublisher?: PlatformEventPublisher;
  logger?: EventDeliveryLogger;
  maxAttempts?: number;
  notificationProjector?: {
    project(event: PlatformEventRecord): Promise<void>;
  };
  processingLeaseMs?: number;
  retryBaseDelayMs?: number;
};

export type PlatformEventDeliveryResult = {
  claimedCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingRetryCount: number;
};

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_PROCESSING_LEASE_MS = 60_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 60_000;

export class PlatformEventDeliveryService {
  constructor(
    private readonly dependencies: PlatformEventDeliveryDependencies,
  ) {}

  async dispatchAvailable(
    input: { batchSize?: number; now?: Date } = {},
  ): Promise<PlatformEventDeliveryResult> {
    const now = input.now ?? new Date();
    const claimed =
      await this.dependencies.eventLogRepository.claimPendingBatch({
        limit: input.batchSize ?? DEFAULT_BATCH_SIZE,
        now,
        staleProcessingBefore: new Date(
          now.getTime() -
            (this.dependencies.processingLeaseMs ??
              DEFAULT_PROCESSING_LEASE_MS),
        ),
      });

    let deliveredCount = 0;
    let failedCount = 0;
    let pendingRetryCount = 0;

    for (const claimedEvent of claimed) {
      try {
        if (this.dependencies.notificationProjector) {
          await this.dependencies.notificationProjector.project(
            claimedEvent.event,
          );
        }

        await this.dependencies.eventLogRepository.markDelivered({
          eventId: claimedEvent.event.id,
          now,
        });
        deliveredCount += 1;

        if (this.dependencies.livePublisher) {
          await publishLiveBestEffort(
            this.dependencies.livePublisher,
            claimedEvent.event,
            this.dependencies.logger,
          );
        }
      } catch (error) {
        const terminal =
          claimedEvent.deliveryAttempts >=
          (this.dependencies.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
        await this.dependencies.eventLogRepository.markFailed({
          eventId: claimedEvent.event.id,
          lastError: serializeError(error),
          nextAvailableAt: new Date(
            now.getTime() +
              getRetryDelayMs(
                claimedEvent.deliveryAttempts,
                this.dependencies.retryBaseDelayMs ??
                  DEFAULT_RETRY_BASE_DELAY_MS,
              ),
          ),
          terminal,
        });

        if (terminal) {
          failedCount += 1;
          this.dependencies.logger?.error(
            {
              err: error,
              eventId: claimedEvent.event.id,
              eventType: claimedEvent.event.type,
            },
            "Platform event delivery failed permanently",
          );
        } else {
          pendingRetryCount += 1;
          this.dependencies.logger?.warn(
            {
              attempt: claimedEvent.deliveryAttempts,
              err: error,
              eventId: claimedEvent.event.id,
              eventType: claimedEvent.event.type,
            },
            "Platform event delivery failed and will be retried",
          );
        }
      }
    }

    return {
      claimedCount: claimed.length,
      deliveredCount,
      failedCount,
      pendingRetryCount,
    };
  }
}

async function publishLiveBestEffort(
  publisher: PlatformEventPublisher,
  event: PlatformEventRecord,
  logger?: Pick<EventDeliveryLogger, "warn">,
) {
  try {
    await publisher.publish(event);
  } catch (error) {
    logger?.warn(
      { err: error, eventId: event.id, eventType: event.type },
      "Platform event live publish failed after durable delivery",
    );
  }
}

function getRetryDelayMs(attempt: number, baseDelayMs: number) {
  return Math.min(
    baseDelayMs * 2 ** Math.max(attempt - 1, 0),
    MAX_RETRY_DELAY_MS,
  );
}

function serializeError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "Unknown delivery failure";

  return message.slice(0, 2_000);
}
