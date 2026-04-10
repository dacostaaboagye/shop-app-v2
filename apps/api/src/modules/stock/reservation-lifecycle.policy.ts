import {
  InvalidReservationInputError,
  ReservationStatusConflictError,
  StockReservationNotFoundError,
  type StockReservationRecord,
  type StockReservationTransaction,
} from "./reservation-lifecycle.contracts.js";

export async function requireActiveReservation(
  transaction: StockReservationTransaction,
  reservationId: string,
  action: "confirm" | "release",
): Promise<StockReservationRecord> {
  const reservation = await requireReservation(transaction, reservationId);

  if (reservation.status !== "active") {
    throw new ReservationStatusConflictError({
      currentStatus: reservation.status,
      detail: `Only active reservations can be ${action}ed.`,
      reservationId,
    });
  }

  return reservation;
}

export async function requireReservation(
  transaction: StockReservationTransaction,
  reservationId: string,
): Promise<StockReservationRecord> {
  const reservation = await transaction.getReservationForUpdate(reservationId);

  if (!reservation) {
    throw new StockReservationNotFoundError(reservationId);
  }

  return reservation;
}

export function addMinutes(now: Date, ttlMinutes: number): Date {
  return new Date(now.getTime() + ttlMinutes * 60_000);
}

export function assertPositiveQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new InvalidReservationInputError(
      "Reservation quantity must be greater than zero.",
      { quantity },
    );
  }
}

export function assertPositiveTtlMinutes(ttlMinutes: number): void {
  if (ttlMinutes <= 0) {
    throw new InvalidReservationInputError(
      "Reservation TTL must be greater than zero minutes.",
      { ttlMinutes },
    );
  }
}

export function assertReleaseReason(reason: string): void {
  if (reason.trim() === "") {
    throw new InvalidReservationInputError(
      "Reservation release reason must be provided.",
    );
  }
}

export function isAlreadyClosedReservation(
  status: StockReservationRecord["status"],
): boolean {
  return status === "cancelled" || status === "expired";
}
