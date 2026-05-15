import type {
  AdminStockBalanceSummary,
  StockWriteOffReasonCode,
  StockWriteOffRequest,
} from "@shop/contracts";

export const STOCK_WRITE_OFF_REASON_OPTIONS: ReadonlyArray<{
  label: string;
  value: StockWriteOffReasonCode;
}> = [
  { label: "Damaged", value: "damaged" },
  { label: "Expired", value: "expired" },
  { label: "Stolen", value: "stolen" },
  { label: "Shrinkage / loss", value: "shrinkage" },
  { label: "Correction", value: "correction" },
];

export type StockWriteOffFormValues = {
  note: string;
  quantity: string;
  reasonCode: StockWriteOffReasonCode;
};

export function createWriteOffFormDefaults(): StockWriteOffFormValues {
  return {
    note: "",
    quantity: "1",
    reasonCode: "damaged",
  };
}

export function validateWriteOffQuantity(value: string, available: number) {
  if (!value.trim()) return "Enter the quantity to write off.";
  if (!/^\d+$/.test(value.trim())) return "Quantity must be a whole number.";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return "Quantity must be a whole number.";
  if (parsed <= 0) return "Quantity must be greater than zero.";
  if (parsed > available) {
    return `Quantity cannot exceed available stock (${available}).`;
  }
  return undefined;
}

export function validateWriteOffNote(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 3) return "Add an evidence note.";
  if (trimmed.length > 500) return "Note must be 500 characters or fewer.";
  return undefined;
}

export function buildWriteOffRequest(input: {
  locationSlug: string;
  row: AdminStockBalanceSummary;
  values: StockWriteOffFormValues;
}): StockWriteOffRequest {
  return {
    locationSlug: input.locationSlug,
    note: input.values.note.trim(),
    quantity: Number.parseInt(input.values.quantity, 10),
    reasonCode: input.values.reasonCode,
    sku: input.row.sku,
  };
}
