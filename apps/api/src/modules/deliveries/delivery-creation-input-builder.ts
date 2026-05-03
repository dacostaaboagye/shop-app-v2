import type {
  DeliveryEligibleOnlineOrder,
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
  DeliverySourceType,
} from "@shop/contracts";
import type { DeliveryDestinationRecord } from "./delivery.types.js";
import type {
  CreateFromOnlineOrderInput,
  CreateFromPosSaleInput,
  CreateFromTransferInput,
} from "./delivery-creation.contracts.js";
import { requireExternalDestination } from "./delivery-creation.support.js";
import {
  DeliveryInvalidDestinationError,
  DeliverySourceStateInvalidError,
} from "./delivery-errors.js";
import {
  isOnlineOrderEligibleForDelivery,
  isPosSaleEligibleForDelivery,
  isTransferEligibleForDelivery,
} from "./delivery-source.policy.js";

export type ComposeInput = {
  sourceType: DeliverySourceType;
  sourceReference: string;
  originLocationId: string;
  destination: DeliveryDestinationRecord;
  items: Array<{ skuId: string; quantity: number }>;
  createdBy: string;
  now: Date | undefined;
  transferContext?: {
    destinationLocationId: string;
    skuSnapshot: {
      sku: string;
      productName: string;
      variantName: string;
    };
    supplyRequestId: string;
  };
};

export function buildPosSaleComposeInput(
  input: CreateFromPosSaleInput,
  sale: DeliveryEligiblePosSale,
): ComposeInput {
  const eligibility = isPosSaleEligibleForDelivery(sale);
  if (!eligibility.eligible) {
    throw new DeliverySourceStateInvalidError({
      sourceType: "pos_sale",
      sourceReference: input.invoiceReference,
      state: eligibility.state,
    });
  }
  return {
    sourceType: "pos_sale",
    sourceReference: input.invoiceReference,
    originLocationId: sale.locationId,
    destination: requireExternalDestination("pos_sale", input.destination),
    items: sale.items,
    createdBy: input.createdBy,
    now: input.now,
  };
}

export function buildOnlineOrderComposeInput(
  input: CreateFromOnlineOrderInput,
  order: DeliveryEligibleOnlineOrder,
): ComposeInput {
  const eligibility = isOnlineOrderEligibleForDelivery(order);
  if (!eligibility.eligible) {
    throw new DeliverySourceStateInvalidError({
      sourceType: "online_order",
      sourceReference: input.orderReference,
      state: eligibility.state,
    });
  }
  return {
    sourceType: "online_order",
    sourceReference: input.orderReference,
    originLocationId: order.locationId,
    destination: requireExternalDestination("online_order", input.destination),
    items: order.items,
    createdBy: input.createdBy,
    now: input.now,
  };
}

export function buildTransferComposeInput(
  input: CreateFromTransferInput,
  transfer: DeliveryEligibleTransfer,
): ComposeInput {
  const eligibility = isTransferEligibleForDelivery(transfer);
  if (!eligibility.eligible) {
    throw new DeliverySourceStateInvalidError({
      sourceType: "transfer",
      sourceReference: input.transferReference,
      state: eligibility.state,
    });
  }
  if (transfer.sourceLocationId === transfer.destinationLocationId) {
    throw new DeliveryInvalidDestinationError({
      sourceType: "transfer",
      reason: "Transfer origin and destination must be different locations.",
    });
  }
  return {
    sourceType: "transfer",
    sourceReference: input.transferReference,
    originLocationId: transfer.sourceLocationId,
    destination: {
      kind: "location",
      locationId: transfer.destinationLocationId,
    },
    items: transfer.items,
    createdBy: input.createdBy,
    now: input.now,
    transferContext: {
      destinationLocationId: transfer.destinationLocationId,
      skuSnapshot: transfer.skuSnapshot,
      supplyRequestId: transfer.supplyRequestId,
    },
  };
}
