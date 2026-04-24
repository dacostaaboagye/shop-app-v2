import {
  type ExpireReservationsResult,
  StockBalanceIntegrityError,
  type StockReservationExpiryRepository,
} from "./reservation-expiry.contracts.js";

export class ReservationExpiryService {
  constructor(private readonly repository: StockReservationExpiryRepository) {}

  async expireReservations(input: {
    expiredBefore: Date;
    limit?: number;
    now?: Date;
  }): Promise<ExpireReservationsResult> {
    const expiredReservationIds: string[] = [];
    const reservationIds =
      await this.repository.findExpiredActiveReservationIds({
        expiredBefore: input.expiredBefore,
        ...(input.limit != null ? { limit: input.limit } : {}),
      });

    for (const reservationId of reservationIds) {
      const expiredId = await this.repository.withTransaction(
        async (transaction) => {
          const reservation =
            await transaction.getReservationForUpdate(reservationId);

          if (
            !reservation ||
            reservation.status !== "active" ||
            reservation.expiresAt == null ||
            reservation.expiresAt > input.expiredBefore
          ) {
            return null;
          }

          const expiredAt = input.now ?? new Date();
          const balanceUpdated = await transaction.adjustStockBalance({
            locationId: reservation.locationId,
            reservedDelta: -reservation.quantity,
            skuId: reservation.skuId,
            updatedAt: expiredAt,
          });

          if (!balanceUpdated) {
            throw new StockBalanceIntegrityError({
              locationId: reservation.locationId,
              reservationId: reservation.id,
              skuId: reservation.skuId,
            });
          }

          const expiredReservation = await transaction.markReservationExpired({
            expiredAt,
            reservationId: reservation.id,
          });

          return expiredReservation.id;
        },
      );

      if (expiredId) {
        expiredReservationIds.push(expiredId);
      }
    }

    return {
      expiredReservationIds,
      status: "completed",
    };
  }
}
