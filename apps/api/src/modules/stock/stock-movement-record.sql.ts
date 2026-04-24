import type { StockMovementRecord } from "./stock-movement-sync.contracts.js";

export const STOCK_MOVEMENT_RECORD_COLUMNS = `
  id,
  created_at AS "createdAt",
  created_by AS "createdBy",
  location_id AS "locationId",
  movement_type AS "movementType",
  occurred_at AS "occurredAt",
  quantity_delta AS "quantityDelta",
  sku_id AS "skuId",
  source_key AS "sourceKey",
  source_type AS "sourceType"
`;

export function requireStockMovement(
  movement: StockMovementRecord | undefined,
  message: string,
): StockMovementRecord {
  if (!movement) {
    throw new Error(message);
  }

  return movement;
}
