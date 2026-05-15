import { AppError } from "../_core/errors/app-error.js";
import {
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  StockBalanceNotFoundError,
  type StockBalanceRecord,
} from "./stock-balance-adjustment.contracts.js";

export type StockMovementType =
  | "sale"
  | "delivery_receipt"
  | "delivery_dispatch"
  | "transfer_in"
  | "transfer_out"
  | "goods_receipt"
  | "manual_adjustment";

export type StockMovementRecord = {
  createdAt: Date;
  createdBy: string | null;
  id: string;
  locationId: string;
  movementType: StockMovementType;
  occurredAt: Date;
  quantityDelta: number;
  skuId: string;
  sourceKey: string;
  sourceType: string;
};

export interface StockMovementSyncTransaction {
  findMovementBySource(input: {
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockMovementRecord | null>;
  getBalanceForUpdate(input: {
    locationId: string;
    skuId: string;
  }): Promise<StockBalanceRecord | null>;
  insertBalance(input: {
    createdAt: Date;
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord>;
  insertMovement(input: {
    createdAt: Date;
    createdBy?: string | null;
    locationId: string;
    movementType: StockMovementType;
    occurredAt: Date;
    quantityDelta: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }): Promise<StockMovementRecord>;
  updateOnHandQuantity(input: {
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord>;
}

export interface StockMovementSyncRepository {
  withTransaction<T>(
    callback: (transaction: StockMovementSyncTransaction) => Promise<T>,
  ): Promise<T>;
}

export type SyncStockMovementResult = {
  movement: StockMovementRecord;
  status: "created" | "noop";
};

export class StockMovementSyncConflictError extends AppError {
  constructor(input: {
    existingMovementId: string;
    locationId: string;
    skuId: string;
    sourceKey: string;
    sourceType: string;
  }) {
    super({
      code: "conflict",
      detail:
        "A stock movement with this source identity already exists with different data.",
      details: input,
      statusCode: 409,
      title: "Stock movement sync conflict",
    });
  }
}

export {
  InvalidStockBalanceInputError,
  StockBalanceAdjustmentConflictError,
  StockBalanceNotFoundError,
};
