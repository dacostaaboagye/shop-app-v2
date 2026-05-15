import type {
  AdminStockMovementQuery,
  ManagerStockMovementQuery,
  StockMovementType,
} from "@shop/contracts";

export const STOCK_MOVEMENT_DEFAULT_FILTER = {
  dateFrom: "",
  dateTo: "",
  locationSlug: "",
  movementType: "",
  page: 1,
  pageSize: 50,
  q: "",
  sku: "",
  sourceType: "",
} satisfies AdminStockMovementQuery;

export type StockMovementFilter = AdminStockMovementQuery;

export const STOCK_MOVEMENT_TYPE_OPTIONS: ReadonlyArray<{
  label: string;
  value: StockMovementType;
}> = [
  { label: "Sales", value: "sale" },
  { label: "Delivery receipts", value: "delivery_receipt" },
  { label: "Delivery dispatches", value: "delivery_dispatch" },
  { label: "Transfer in", value: "transfer_in" },
  { label: "Transfer out", value: "transfer_out" },
  { label: "Goods receipts", value: "goods_receipt" },
  { label: "Manual adjustments", value: "manual_adjustment" },
];

export const STOCK_SOURCE_TYPE_OPTIONS = [
  { label: "Supplier receipts", value: "supplier_procurement_receipt" },
  { label: "Stock takes", value: "stock_take" },
  { label: "Stock write-offs", value: "stock_write_off" },
  { label: "Opening stock", value: "opening_stock" },
  { label: "Admin counts", value: "admin_count" },
  { label: "POS sales", value: "pos_sale" },
  { label: "POS returns", value: "pos_return" },
  { label: "Supply requests", value: "supply_request" },
] as const;

export function hasStockMovementFilter(filter: StockMovementFilter): boolean {
  return Boolean(
    filter.dateFrom ||
      filter.dateTo ||
      filter.locationSlug ||
      filter.movementType ||
      filter.q ||
      filter.sku ||
      filter.sourceType,
  );
}

export function toManagerMovementQuery(
  filter: StockMovementFilter,
  locationSlug: string,
): ManagerStockMovementQuery {
  return {
    ...filter,
    locationSlug,
  };
}

export function formatMovementLabel(value: string): string {
  return value.replaceAll("_", " ");
}
