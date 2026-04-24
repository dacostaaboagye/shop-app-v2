import type { PlatformEventDeliveryHealthResponse } from "@shop/contracts";
import type { PlatformEventDeliveryHealthRow } from "./postgres-platform-event-delivery-health.repository.js";

type PlatformEventDeliveryHealthDependencies = {
  processingLeaseMs: number;
  repository: {
    getHealth(input: {
      staleProcessingBefore: Date;
    }): Promise<PlatformEventDeliveryHealthRow>;
  };
};

export class PlatformEventDeliveryHealthService {
  constructor(
    private readonly dependencies: PlatformEventDeliveryHealthDependencies,
  ) {}

  async getHealth(input: {
    now: Date;
  }): Promise<PlatformEventDeliveryHealthResponse> {
    const health = await this.dependencies.repository.getHealth({
      staleProcessingBefore: new Date(
        input.now.getTime() - this.dependencies.processingLeaseMs,
      ),
    });

    return {
      deliveredCount: health.deliveredCount,
      failedCount: health.failedCount,
      generatedAt: input.now.toISOString(),
      oldestFailedAt: health.oldestFailedAt?.toISOString() ?? null,
      oldestPendingAt: health.oldestPendingAt?.toISOString() ?? null,
      pendingCount: health.pendingCount,
      processingCount: health.processingCount,
      statusCounts: health.statusCounts,
      stuckProcessingCount: health.stuckProcessingCount,
    };
  }
}
