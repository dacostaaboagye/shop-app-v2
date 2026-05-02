import type {
  DeliveryEligibleOnlineOrder,
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
} from "@shop/contracts";

export type EligibilityVerdict =
  | { eligible: true }
  | { eligible: false; state: string };

export function isPosSaleEligibleForDelivery(
  sale: Pick<DeliveryEligiblePosSale, "state">,
): EligibilityVerdict {
  if (sale.state === "confirmed") {
    return { eligible: true };
  }
  return { eligible: false, state: sale.state };
}

export function isOnlineOrderEligibleForDelivery(
  order: Pick<DeliveryEligibleOnlineOrder, "state">,
): EligibilityVerdict {
  if (order.state === "confirmed") {
    return { eligible: true };
  }
  return { eligible: false, state: order.state };
}

export function isTransferEligibleForDelivery(
  transfer: Pick<DeliveryEligibleTransfer, "state">,
): EligibilityVerdict {
  if (transfer.state === "approved") {
    return { eligible: true };
  }
  return { eligible: false, state: transfer.state };
}
