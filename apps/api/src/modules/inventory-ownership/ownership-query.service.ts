import { resolveOwnerFromEvent } from "./ownership-resolution.policy.js";

export type OwnershipEventType =
  | "assigned"
  | "reassigned"
  | "handover_out"
  | "handover_in"
  | "reverted"
  | "cancelled";

export type OwnershipEventRecord = {
  id: string;
  createdAt: Date;
  effectiveFrom: Date;
  eventType: OwnershipEventType;
  handoverChainId: string | null;
  locationId: string;
  skuId: string;
  quantity: number;
  workerId: string;
};

export type OwnershipHistoryEntry = OwnershipEventRecord;

export type OwnershipQueryWarning = {
  event: OwnershipEventRecord;
  skuId: string;
  reason: "cancelled_owner_event" | "handover_without_receiver";
  timestamp: Date;
  locationId: string;
};

export interface OwnershipQueryRepository {
  getLatestEventAtOrBefore(input: {
    locationId: string;
    skuId: string;
    timestamp: Date;
  }): Promise<OwnershipEventRecord | null>;
  getOwnershipHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<OwnershipHistoryEntry[]>;
}

type OwnershipQueryServiceOptions = {
  onWarning?: (warning: OwnershipQueryWarning) => void;
};

export class OwnershipQueryService {
  constructor(
    private readonly repository: OwnershipQueryRepository,
    private readonly options: OwnershipQueryServiceOptions = {},
  ) {}

  async getCurrentOwner(input: {
    now?: Date;
    locationId: string;
    skuId: string;
  }): Promise<string | null> {
    const latestEvent = await this.getOwnershipEventAt({
      locationId: input.locationId,
      skuId: input.skuId,
      timestamp: input.now ?? new Date(),
    });

    if (!latestEvent) {
      return null;
    }

    const resolution = resolveOwnerFromEvent(latestEvent);

    if (resolution.status === "unowned") {
      this.reportWarning(
        {
          locationId: input.locationId,
          skuId: input.skuId,
          timestamp: input.now ?? new Date(),
        },
        latestEvent,
        resolution.reason,
      );
      return null;
    }

    return resolution.workerId;
  }

  async getOwnerAt(input: {
    locationId: string;
    skuId: string;
    timestamp: Date;
  }): Promise<string | null> {
    const latestEvent = await this.getOwnershipEventAt(input);

    if (!latestEvent) {
      return null;
    }

    const resolution = resolveOwnerFromEvent(latestEvent);

    if (resolution.status === "unowned") {
      this.reportWarning(input, latestEvent, resolution.reason);
      return null;
    }

    return resolution.workerId;
  }

  async getOwnershipHistory(input: {
    locationId: string;
    skuId: string;
  }): Promise<OwnershipHistoryEntry[]> {
    return this.repository.getOwnershipHistory(input);
  }

  async getCurrentOwnershipEvent(input: {
    now?: Date;
    locationId: string;
    skuId: string;
  }): Promise<OwnershipEventRecord | null> {
    return this.getOwnershipEventAt({
      locationId: input.locationId,
      skuId: input.skuId,
      timestamp: input.now ?? new Date(),
    });
  }

  async getOwnershipEventAt(input: {
    locationId: string;
    skuId: string;
    timestamp: Date;
  }): Promise<OwnershipEventRecord | null> {
    return this.repository.getLatestEventAtOrBefore(input);
  }

  private reportWarning(
    input: {
      locationId: string;
      skuId: string;
      timestamp: Date;
    },
    event: OwnershipEventRecord,
    reason: OwnershipQueryWarning["reason"],
  ): void {
    this.options.onWarning?.({
      event,
      locationId: input.locationId,
      skuId: input.skuId,
      reason,
      timestamp: input.timestamp,
    });
  }
}
