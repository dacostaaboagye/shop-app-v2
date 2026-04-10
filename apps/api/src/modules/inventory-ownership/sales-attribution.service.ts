import { AppError } from "../_core/errors/app-error.js";
import type {
  OwnershipEventRecord,
  OwnershipQueryService,
} from "./ownership-query.service.js";
import {
  type OwnershipResolutionReason,
  resolveOwnerFromEvent,
} from "./ownership-resolution.policy.js";

export type SaleAttributionResult = {
  ownershipEvent: OwnershipEventRecord;
  workerId: string;
};

export class SaleAttributionUnavailableError extends AppError {
  constructor(input: {
    locationId: string;
    reason: "missing_owner_event" | OwnershipResolutionReason;
    skuId: string;
    soldAt: Date;
  }) {
    super({
      code: "conflict",
      detail:
        "This sale cannot be attributed because no accountable owner was resolved at the sale timestamp.",
      details: {
        locationId: input.locationId,
        reason: input.reason,
        skuId: input.skuId,
        soldAt: input.soldAt.toISOString(),
      },
      statusCode: 409,
      title: "Sale attribution unavailable",
    });
  }
}

export class SalesAttributionService {
  constructor(private readonly ownershipQueryService: OwnershipQueryService) {}

  async attributeSale(input: {
    locationId: string;
    skuId: string;
    soldAt: Date;
  }): Promise<SaleAttributionResult> {
    const ownershipEvent = await this.ownershipQueryService.getOwnershipEventAt(
      {
        locationId: input.locationId,
        skuId: input.skuId,
        timestamp: input.soldAt,
      },
    );

    if (!ownershipEvent) {
      throw new SaleAttributionUnavailableError({
        locationId: input.locationId,
        reason: "missing_owner_event",
        skuId: input.skuId,
        soldAt: input.soldAt,
      });
    }

    const resolution = resolveOwnerFromEvent(ownershipEvent);

    if (resolution.status === "unowned") {
      throw new SaleAttributionUnavailableError({
        locationId: input.locationId,
        reason: resolution.reason,
        skuId: input.skuId,
        soldAt: input.soldAt,
      });
    }

    return {
      ownershipEvent,
      workerId: resolution.workerId,
    };
  }
}
