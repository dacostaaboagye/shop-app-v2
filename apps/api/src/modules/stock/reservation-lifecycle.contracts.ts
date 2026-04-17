import { AppError } from "../_core/errors/app-error.js";
import type { StockAvailabilityRepository } from "./availability-query.service.js";

export type StockReservationRecord = {
  id: string;
  cancelledAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  expiresAt: Date | null;
  locationId: string;
  quantity: number;
  releasedAt: Date | null;
  skuId: string;
  sourceKey: string;
  sourceType: string;
  status: "active" | "cancelled" | "confirmed" | "expired" | "released";
  updatedAt: Date;
};

type AdjustStockBalanceInput = {
  locationId: string;
  onHandDelta?: number;
  reservedDelta?: number;
  skuId: string;
  updatedAt: Date;
  updatedBy?: string | null;
};

type FindActiveReservationBySourceInput = {
  locationId: string;
  skuId: string;
  sourceKey: string;
  sourceType: string;
};

type InsertReservationInput = {
  createdAt: Date;
  createdBy?: string | null;
  expiresAt: Date | null;
  locationId: string;
  quantity: number;
  skuId: string;
  sourceKey: string;
  sourceType: string;
};

export interface StockReservationTransaction
  extends StockAvailabilityRepository {
  adjustStockBalance(input: AdjustStockBalanceInput): Promise<boolean>;
  findActiveReservationBySource(
    input: FindActiveReservationBySourceInput,
  ): Promise<StockReservationRecord | null>;
  getReservationForUpdate(
    reservationId: string,
  ): Promise<StockReservationRecord | null>;
  insertReservation(
    input: InsertReservationInput,
  ): Promise<StockReservationRecord>;
  markReservationConfirmed(input: {
    confirmedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord>;
  markReservationReleased(input: {
    releasedAt: Date;
    reservationId: string;
  }): Promise<StockReservationRecord>;
}

export interface StockReservationLifecycleRepository {
  withTransaction<T>(
    callback: (transaction: StockReservationTransaction) => Promise<T>,
  ): Promise<T>;
}

export type CreateReservationResult = {
  reservation: StockReservationRecord;
  status: "created" | "noop";
};

export type ConfirmReservationResult = {
  reservation: StockReservationRecord;
  status: "confirmed";
};

export type ReleaseReservationResult = {
  reservation: StockReservationRecord;
  status: "noop" | "released";
};

export class InsufficientStockError extends AppError {
  constructor(input: {
    availableQuantity: number;
    locationId: string;
    requestedQuantity: number;
    skuId: string;
  }) {
    super({
      code: "conflict",
      detail: "There is not enough available stock to create this reservation.",
      details: input,
      statusCode: 409,
      title: "Insufficient stock",
    });
  }
}

export class InvalidReservationInputError extends AppError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super({
      code: "validation_error",
      detail,
      ...(details ? { details } : {}),
      statusCode: 400,
      title: "Invalid reservation input",
    });
  }
}

export class StockReservationNotFoundError extends AppError {
  constructor(reservationId: string) {
    super({
      code: "not_found",
      detail: `No stock reservation exists for ${reservationId}.`,
      details: { reservationId },
      statusCode: 404,
      title: "Stock reservation not found",
    });
  }
}

export class ReservationStatusConflictError extends AppError {
  constructor(input: {
    currentStatus: StockReservationRecord["status"];
    detail: string;
    reservationId: string;
  }) {
    super({
      code: "conflict",
      detail: input.detail,
      details: {
        currentStatus: input.currentStatus,
        reservationId: input.reservationId,
      },
      statusCode: 409,
      title: "Reservation state conflict",
    });
  }
}

export class StockBalanceIntegrityError extends AppError {
  constructor(input: {
    locationId: string;
    reservationId?: string;
    skuId: string;
  }) {
    super({
      code: "internal_error",
      detail:
        "The stock balance row required for this reservation workflow is missing.",
      details: input,
      statusCode: 500,
      title: "Stock balance missing",
    });
  }
}
