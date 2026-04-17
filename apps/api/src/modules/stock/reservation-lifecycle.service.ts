import { StockAvailabilityService } from "./availability-query.service.js";
import {
  type ConfirmReservationResult,
  type CreateReservationResult,
  InsufficientStockError,
  type ReleaseReservationResult,
  ReservationStatusConflictError,
  StockBalanceIntegrityError,
  type StockReservationLifecycleRepository,
} from "./reservation-lifecycle.contracts.js";
import {
  addMinutes,
  assertPositiveQuantity,
  assertPositiveTtlMinutes,
  assertReleaseReason,
  isAlreadyClosedReservation,
  requireActiveReservation,
  requireReservation,
} from "./reservation-lifecycle.policy.js";
export class StockReservationLifecycleService {
  constructor(
    private readonly repository: StockReservationLifecycleRepository,
  ) {}

  async createReservation(input: {
    createdBy?: string;
    locationId: string;
    now?: Date;
    quantity: number;
    skuId: string;
    sourceKey: string;
    sourceType: string;
    ttlMinutes: number;
  }): Promise<CreateReservationResult> {
    assertPositiveQuantity(input.quantity);
    assertPositiveTtlMinutes(input.ttlMinutes);

    return this.repository.withTransaction(async (transaction) => {
      const existingReservation =
        await transaction.findActiveReservationBySource({
          locationId: input.locationId,
          skuId: input.skuId,
          sourceKey: input.sourceKey,
          sourceType: input.sourceType,
        });

      if (existingReservation) {
        if (existingReservation.quantity !== input.quantity) {
          throw new ReservationStatusConflictError({
            currentStatus: existingReservation.status,
            detail:
              "An active reservation already exists for this source with a different quantity.",
            reservationId: existingReservation.id,
          });
        }

        return {
          reservation: existingReservation,
          status: "noop",
        };
      }

      const now = input.now ?? new Date();
      const availabilityService = new StockAvailabilityService(transaction);
      const availableQuantity = await availabilityService.getAvailableStock({
        locationId: input.locationId,
        lock: "for_update",
        skuId: input.skuId,
      });

      if (availableQuantity < input.quantity) {
        throw new InsufficientStockError({
          availableQuantity,
          locationId: input.locationId,
          requestedQuantity: input.quantity,
          skuId: input.skuId,
        });
      }

      const reservation = await transaction.insertReservation({
        createdAt: now,
        ...(input.createdBy ? { createdBy: input.createdBy } : {}),
        expiresAt: addMinutes(now, input.ttlMinutes),
        locationId: input.locationId,
        quantity: input.quantity,
        skuId: input.skuId,
        sourceKey: input.sourceKey,
        sourceType: input.sourceType,
      });
      const balanceUpdated = await transaction.adjustStockBalance({
        locationId: input.locationId,
        reservedDelta: input.quantity,
        skuId: input.skuId,
        updatedAt: now,
        ...(input.createdBy ? { updatedBy: input.createdBy } : {}),
      });

      if (!balanceUpdated) {
        throw new StockBalanceIntegrityError({
          locationId: input.locationId,
          reservationId: reservation.id,
          skuId: input.skuId,
        });
      }

      return {
        reservation,
        status: "created",
      };
    });
  }

  async confirmReservation(input: {
    now?: Date;
    reservationId: string;
  }): Promise<ConfirmReservationResult> {
    return this.repository.withTransaction(async (transaction) => {
      const reservation = await requireActiveReservation(
        transaction,
        input.reservationId,
        "confirm",
      );
      const now = input.now ?? new Date();
      const balanceUpdated = await transaction.adjustStockBalance({
        locationId: reservation.locationId,
        onHandDelta: -reservation.quantity,
        reservedDelta: -reservation.quantity,
        skuId: reservation.skuId,
        updatedAt: now,
      });

      if (!balanceUpdated) {
        throw new StockBalanceIntegrityError({
          locationId: reservation.locationId,
          reservationId: reservation.id,
          skuId: reservation.skuId,
        });
      }

      return {
        reservation: await transaction.markReservationConfirmed({
          confirmedAt: now,
          reservationId: reservation.id,
        }),
        status: "confirmed",
      };
    });
  }

  async releaseReservation(input: {
    now?: Date;
    reason: string;
    reservationId: string;
  }): Promise<ReleaseReservationResult> {
    assertReleaseReason(input.reason);

    return this.repository.withTransaction(async (transaction) => {
      const reservation = await requireReservation(
        transaction,
        input.reservationId,
      );

      if (reservation.status === "released") {
        return {
          reservation,
          status: "noop",
        };
      }

      if (isAlreadyClosedReservation(reservation.status)) {
        return {
          reservation,
          status: "noop",
        };
      }

      if (reservation.status !== "active") {
        throw new ReservationStatusConflictError({
          currentStatus: reservation.status,
          detail:
            "Only active reservations can be released back into available stock.",
          reservationId: reservation.id,
        });
      }

      const now = input.now ?? new Date();
      const balanceUpdated = await transaction.adjustStockBalance({
        locationId: reservation.locationId,
        reservedDelta: -reservation.quantity,
        skuId: reservation.skuId,
        updatedAt: now,
      });

      if (!balanceUpdated) {
        throw new StockBalanceIntegrityError({
          locationId: reservation.locationId,
          reservationId: reservation.id,
          skuId: reservation.skuId,
        });
      }

      return {
        reservation: await transaction.markReservationReleased({
          releasedAt: now,
          reservationId: reservation.id,
        }),
        status: "released",
      };
    });
  }
}
