import type { StockBalanceRecord } from "./stock-balance-adjustment.contracts.js";

export const STOCK_BALANCE_RECORD_COLUMNS = `
  id,
  created_at AS "createdAt",
  location_id AS "locationId",
  on_hand_quantity AS "onHandQuantity",
  reserved_quantity AS "reservedQuantity",
  sku_id AS "skuId",
  updated_at AS "updatedAt",
  updated_by AS "updatedBy"
`;

export function requireStockBalance(
  balance: StockBalanceRecord | undefined,
  message: string,
): StockBalanceRecord {
  if (!balance) {
    throw new Error(message);
  }

  return balance;
}
