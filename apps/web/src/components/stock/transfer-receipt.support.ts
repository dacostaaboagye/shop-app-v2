import type {
  ConfirmReceipt,
  ReceiptDiscrepancyReason,
  StockSupplyRequestResponse,
} from "@shop/contracts";

export type TransferReceiptFormValues = {
  discrepancyNotes: string;
  discrepancyReason: ReceiptDiscrepancyReason;
  notes: string;
  receivedQuantity: string;
};

export const receiptDiscrepancyReasonOptions: ReadonlyArray<{
  label: string;
  value: ReceiptDiscrepancyReason;
}> = [
  { label: "Short received", value: "short_received" },
  { label: "Damaged goods", value: "damaged_received" },
  { label: "Wrong item", value: "wrong_item" },
  { label: "Other", value: "other" },
];

export function createTransferReceiptDefaults(
  item: StockSupplyRequestResponse | null,
): TransferReceiptFormValues {
  return {
    discrepancyNotes: "",
    discrepancyReason: "short_received",
    notes: "",
    receivedQuantity: item ? String(getExpectedTransferQuantity(item)) : "",
  };
}

export function getExpectedTransferQuantity(item: StockSupplyRequestResponse) {
  return item.approvedQuantity ?? item.requestedQuantity;
}

export function getReceiptFormError(
  values: TransferReceiptFormValues,
  expectedQuantity: number,
) {
  const receivedQuantity = parseReceivedQuantity(values.receivedQuantity);
  if (receivedQuantity === null) {
    return "Enter a whole received quantity.";
  }
  if (receivedQuantity > expectedQuantity) {
    return "Received quantity cannot be higher than dispatched quantity.";
  }
  return null;
}

export function hasReceiptFormDiscrepancy(
  values: TransferReceiptFormValues,
  expectedQuantity: number,
) {
  const receivedQuantity = parseReceivedQuantity(values.receivedQuantity);
  return receivedQuantity !== null && receivedQuantity < expectedQuantity;
}

export function hasTransferReceiptDiscrepancy(
  item: StockSupplyRequestResponse,
) {
  return getTransferReceiptMissingQuantity(item) > 0;
}

export function getTransferReceiptMissingQuantity(
  item: StockSupplyRequestResponse,
) {
  if (item.receivedQuantity === null) {
    return 0;
  }
  return Math.max(0, getExpectedTransferQuantity(item) - item.receivedQuantity);
}

export function formatReceiptDiscrepancyReason(
  reason: ReceiptDiscrepancyReason | null,
) {
  return (
    receiptDiscrepancyReasonOptions.find((option) => option.value === reason)
      ?.label ?? "Not recorded"
  );
}

export function buildConfirmReceiptPayload(
  values: TransferReceiptFormValues,
  expectedQuantity: number,
  extra?: Pick<ConfirmReceipt, "adminOverrideReason">,
): ConfirmReceipt {
  const receivedQuantity =
    parseReceivedQuantity(values.receivedQuantity) ?? expectedQuantity;
  const hasDiscrepancy = receivedQuantity < expectedQuantity;

  return {
    ...(extra?.adminOverrideReason
      ? { adminOverrideReason: extra.adminOverrideReason }
      : {}),
    ...(hasDiscrepancy
      ? {
          discrepancyReason: values.discrepancyReason,
          ...(values.discrepancyNotes.trim()
            ? { discrepancyNotes: values.discrepancyNotes.trim() }
            : {}),
        }
      : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    receivedQuantity,
  };
}

function parseReceivedQuantity(value: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}
