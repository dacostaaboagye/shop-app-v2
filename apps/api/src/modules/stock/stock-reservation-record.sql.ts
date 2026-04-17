import type { StockReservationRecord } from "./reservation-lifecycle.contracts.js";

export const STOCK_RESERVATION_RECORD_COLUMNS = `
  id,
  cancelled_at AS "cancelledAt",
  confirmed_at AS "confirmedAt",
  created_at AS "createdAt",
  created_by AS "createdBy",
  expires_at AS "expiresAt",
  location_id AS "locationId",
  quantity,
  released_at AS "releasedAt",
  sku_id AS "skuId",
  source_key AS "sourceKey",
  source_type AS "sourceType",
  status,
  updated_at AS "updatedAt"
`;

export function requireStockReservation(
  reservation: StockReservationRecord | undefined,
  message: string,
): StockReservationRecord {
  if (!reservation) {
    throw new Error(message);
  }

  return reservation;
}
