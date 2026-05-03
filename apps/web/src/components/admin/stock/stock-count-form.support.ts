import type {
  AdminStockBalanceSummary,
  AdminStockCountRequest,
  StockCountReasonCode,
} from "@shop/contracts";

export type StockCountFormProps = {
  error: unknown;
  initialTarget?: StockCountInitialTarget | null;
  isPending: boolean;
  locationSlug: string;
  onCancel: () => void;
  onSubmit: (req: AdminStockCountRequest) => void;
  row: AdminStockBalanceSummary | null;
};

export type StockCountInitialTarget = {
  onHandQuantity: number;
  productName: string;
  reservedQuantity: number;
  sku: string;
  variantName: string;
};

export const STOCK_COUNT_REASON_OPTIONS: ReadonlyArray<{
  label: string;
  value: StockCountReasonCode;
}> = [
  { label: "Opening count", value: "opening_count" },
  { label: "Cycle count", value: "cycle_count" },
  { label: "Damaged stock", value: "damaged" },
  { label: "Found stock", value: "found_stock" },
  { label: "Correction", value: "correction" },
  { label: "Shrinkage / loss", value: "shrinkage" },
  { label: "Return restock", value: "return_restock" },
];

export type StockCountFormValues = {
  note: string;
  quantity: string;
  reasonCode: StockCountReasonCode;
  sku: string;
};

export function createStockCountFormDefaults(
  row: AdminStockBalanceSummary | null,
  initialTarget?: StockCountInitialTarget | null,
): StockCountFormValues {
  return {
    note: "",
    quantity: row
      ? String(row.onHandQuantity)
      : initialTarget
        ? String(initialTarget.onHandQuantity)
        : "",
    reasonCode: row ? "cycle_count" : "opening_count",
    sku: row?.sku ?? initialTarget?.sku ?? "",
  };
}

export function validateStockCountSku(value: string) {
  if (!value.trim()) return "Enter or scan the SKU.";
  if (value.trim().length > 120) return "SKU must be 120 characters or fewer.";
  return undefined;
}

export function validateStockCountQuantity(value: string) {
  if (!value.trim()) return "Enter the physical on-hand quantity.";
  if (!/^\d+$/.test(value.trim())) return "Quantity must be a whole number.";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return "Quantity must be a whole number.";
  if (parsed < 0) return "Quantity cannot be negative.";
  return undefined;
}

export function validateStockCountNote(value: string) {
  if (value.length > 500) return "Note must be 500 characters or fewer.";
  return undefined;
}

export function buildStockCountRequest(input: {
  locationSlug: string;
  row: AdminStockBalanceSummary | null;
  values: StockCountFormValues;
}): AdminStockCountRequest {
  const sku = input.row ? input.row.sku : input.values.sku.trim();
  const note = input.values.note.trim();

  return {
    locationSlug: input.locationSlug,
    note: note || undefined,
    onHandQuantity: Number.parseInt(input.values.quantity, 10),
    reasonCode: input.values.reasonCode,
    sku,
  };
}
