import {
  StockBalanceIntegrityError,
  type StockReservationRecord,
} from "./reservation-lifecycle.contracts.js";

type AdjustStockBalanceInput = {
  locationId: string;
  onHandDelta?: number;
  reservedDelta?: number;
  skuId: string;
  updatedAt: Date;
  updatedBy?: string | null;
};

export interface StockReservationExpiryTransaction {
  adjustStockBalance(input: AdjustStockBalanceInput): Promise<boolean>;
  getReservationForUpdate(
    reservationId: string,
  ): Promise<StockReservationRecord | null>;
  markReservationExpired(input: {
    expiredAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord>;
}

export interface StockReservationExpiryRepository {
  findExpiredActiveReservationIds(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<string[]>;
  withTransaction<T>(
    callback: (transaction: StockReservationExpiryTransaction) => Promise<T>,
  ): Promise<T>;
}

export type ExpireReservationsResult = {
  expiredReservationIds: string[];
  status: "completed";
};

export { StockBalanceIntegrityError };
