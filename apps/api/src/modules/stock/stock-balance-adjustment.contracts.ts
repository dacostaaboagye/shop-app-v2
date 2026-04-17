import { AppError } from "../_core/errors/app-error.js";

export type StockBalanceRecord = {
  createdAt: Date;
  id: string;
  locationId: string;
  onHandQuantity: number;
  reservedQuantity: number;
  skuId: string;
  updatedAt: Date;
  updatedBy: string | null;
};

export interface StockBalanceAdjustmentTransaction {
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
  updateOnHandQuantity(input: {
    locationId: string;
    onHandQuantity: number;
    skuId: string;
    updatedAt: Date;
    updatedBy?: string | null;
  }): Promise<StockBalanceRecord>;
}

export interface StockBalanceAdjustmentRepository {
  withTransaction<T>(
    callback: (transaction: StockBalanceAdjustmentTransaction) => Promise<T>,
  ): Promise<T>;
}

export type InitializeStockBalanceResult = {
  balance: StockBalanceRecord;
  status: "created" | "noop";
};

export type AdjustStockBalanceResult = {
  balance: StockBalanceRecord;
  previousOnHandQuantity: number;
  status: "adjusted";
};

export class InvalidStockBalanceInputError extends AppError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super({
      code: "validation_error",
      detail,
      ...(details ? { details } : {}),
      statusCode: 400,
      title: "Invalid stock balance input",
    });
  }
}

export class StockBalanceAlreadyInitializedError extends AppError {
  constructor(input: {
    currentOnHandQuantity: number;
    currentReservedQuantity: number;
    locationId: string;
    skuId: string;
  }) {
    super({
      code: "conflict",
      detail:
        "A stock balance already exists for this SKU and location with different quantities.",
      details: input,
      statusCode: 409,
      title: "Stock balance already initialized",
    });
  }
}

export class StockBalanceNotFoundError extends AppError {
  constructor(input: { locationId: string; skuId: string }) {
    super({
      code: "not_found",
      detail: "No stock balance exists for this SKU and location.",
      details: input,
      statusCode: 404,
      title: "Stock balance not found",
    });
  }
}

export class StockBalanceAdjustmentConflictError extends AppError {
  constructor(input: {
    locationId: string;
    nextOnHandQuantity: number;
    quantityDelta: number;
    reservedQuantity: number;
    skuId: string;
  }) {
    super({
      code: "conflict",
      detail:
        "This stock adjustment would reduce on-hand quantity below the reserved quantity.",
      details: input,
      statusCode: 409,
      title: "Invalid stock adjustment",
    });
  }
}
