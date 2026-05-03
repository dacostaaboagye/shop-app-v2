import type {
  DeliveryAddressSnapshot,
  DeliveryEligibleSourceItem,
  DeliverySourceType,
} from "@shop/contracts";
import type {
  DeliveryDestinationRecord,
  DeliveryItemRecord,
  DeliveryRecord,
} from "./delivery.types.js";
import type {
  DeliveryCreationStockSideEffectsPort,
  DeliveryCreationTransaction,
} from "./delivery-creation.contracts.js";
import {
  DeliveryInsufficientOriginStockError,
  DeliveryInvalidDestinationError,
  DeliveryInvalidSourceQuantityError,
  DeliverySourceConflictError,
} from "./delivery-errors.js";

export const DELIVERIES_SOURCE_UNIQUE_CONSTRAINT = "deliveries_source_unique";
export const DELIVERY_ITEMS_REFERENCE_UNIQUE_CONSTRAINT =
  "delivery_items_reference_unique";

export function requireExternalDestination(
  sourceType: DeliverySourceType,
  destination: DeliveryAddressSnapshot,
): DeliveryDestinationRecord {
  if (!destination) {
    throw new DeliveryInvalidDestinationError({
      sourceType,
      reason: `${sourceType} requires an external destination snapshot.`,
    });
  }
  return { kind: "external", snapshot: destination };
}

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

export function assertPositiveIntegerSourceQuantities(input: {
  items: DeliveryEligibleSourceItem[];
  sourceReference: string;
  sourceType: DeliverySourceType;
}): void {
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new DeliveryInvalidSourceQuantityError({
        quantity: item.quantity,
        skuId: item.skuId,
        sourceReference: input.sourceReference,
        sourceType: input.sourceType,
      });
    }
  }
}

export async function applyDeliveryCreationStockSideEffectsOrThrow(
  port: DeliveryCreationStockSideEffectsPort,
  input: {
    createdBy: string;
    items: DeliveryItemRecord[];
    now: Date;
    originLocationId: string;
    sourceReference: string;
    sourceType: DeliverySourceType;
    tx: DeliveryCreationTransaction;
  },
): Promise<void> {
  const stockResult = await port.applyWithinTransaction({
    ...input,
    items: input.items.map((item) => ({
      itemReference: item.itemReference,
      quantity: item.quantity,
      skuId: item.skuId,
    })),
  });

  if (stockResult.status === "insufficient_stock") {
    throw new DeliveryInsufficientOriginStockError({
      locationId: input.originLocationId,
      shortfalls: stockResult.shortfalls,
      sourceReference: input.sourceReference,
      sourceType: input.sourceType,
    });
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
  return isPgUniqueViolation(error, DELIVERIES_SOURCE_UNIQUE_CONSTRAINT);
}

export function isDeliveryItemReferenceUniqueViolation(
  error: unknown,
): boolean {
  return isPgUniqueViolation(error, DELIVERY_ITEMS_REFERENCE_UNIQUE_CONSTRAINT);
}

function isPgUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; constraint?: unknown };
  return candidate.code === "23505" && candidate.constraint === constraint;
}
