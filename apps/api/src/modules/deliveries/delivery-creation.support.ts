import type {
  DeliveryEligibleSourceItem,
  DeliverySourceType,
} from "@shop/contracts";
import type { DeliveryItemRecord, DeliveryRecord } from "./delivery.types.js";
import { DeliverySourceConflictError } from "./delivery-errors.js";

export const DELIVERIES_SOURCE_UNIQUE_CONSTRAINT = "deliveries_source_unique";

export function verifySourceMatch(
  existing: DeliveryRecord,
  input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
    originLocationId: string;
    items: DeliveryEligibleSourceItem[];
  },
): void {
  if (existing.originLocationId !== input.originLocationId) {
    throw new DeliverySourceConflictError({
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
    });
  }
  if (existing.items.length !== input.items.length) {
    throw new DeliverySourceConflictError({
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
    });
  }
  const sortedExisting = [...existing.items].sort(compareItems);
  const sortedRequest = [...input.items].sort(compareItemRequest);
  for (let index = 0; index < sortedExisting.length; index += 1) {
    const left = sortedExisting[index];
    const right = sortedRequest[index];
    if (
      !left ||
      !right ||
      left.skuId !== right.skuId ||
      left.quantity !== right.quantity
    ) {
      throw new DeliverySourceConflictError({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      });
    }
  }
}

function compareItems(left: DeliveryItemRecord, right: DeliveryItemRecord) {
  return left.skuId.localeCompare(right.skuId);
}

function compareItemRequest(
  left: DeliveryEligibleSourceItem,
  right: DeliveryEligibleSourceItem,
) {
  return left.skuId.localeCompare(right.skuId);
}

export function isDeliverySourceUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    candidate.code === "23505" &&
    candidate.constraint === DELIVERIES_SOURCE_UNIQUE_CONSTRAINT
  );
}
