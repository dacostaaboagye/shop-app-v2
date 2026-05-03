import assert from "node:assert/strict";
import type { StockAvailabilitySnapshot } from "../src/modules/stock/availability-query.service.js";
import type {
  StockReservationLifecycleRepository,
  StockReservationRecord,
  StockReservationTransaction,
} from "../src/modules/stock/reservation-lifecycle.contracts.js";
import { StockReservationLifecycleService } from "../src/modules/stock/reservation-lifecycle.service.js";

export function createHarness(input?: {
  balance?: { onHandQuantity: number; reservedQuantity: number } | null;
  reservations?: StockReservationRecord[];
}) {
  const state = {
    availabilityCommands: [] as Array<{
      excludeReservationId?: string;
      locationId: string;
      lock?: "for_update";
      skuId: string;
    }>,
    balance: input?.balance ?? null,
    insertedReservations: [] as StockReservationRecord[],
    releaseCount: 0,
    reservations: [...(input?.reservations ?? [])],
  };

  const transaction: StockReservationTransaction = {
    async adjustStockBalance(command) {
      if (!state.balance) {
        return false;
      }

      state.balance = {
        onHandQuantity:
          state.balance.onHandQuantity + (command.onHandDelta ?? 0),
        reservedQuantity:
          state.balance.reservedQuantity + (command.reservedDelta ?? 0),
      };
      return true;
    },
    async findActiveReservationBySource(command) {
      return (
        state.reservations.find(
          (reservation) =>
            reservation.locationId === command.locationId &&
            reservation.skuId === command.skuId &&
            reservation.sourceKey === command.sourceKey &&
            reservation.sourceType === command.sourceType &&
            reservation.status === "active",
        ) ?? null
      );
    },
    async getReservationForUpdate(reservationId) {
      return (
        state.reservations.find(
          (reservation) => reservation.id === reservationId,
        ) ?? null
      );
    },
    async getStockAvailabilitySnapshot(command) {
      state.availabilityCommands.push(command);

      if (!state.balance) {
        return null;
      }

      return {
        activeReservationQuantity: getActiveReservationQuantity(
          state.reservations,
          command.excludeReservationId,
        ),
        onHandQuantity: state.balance.onHandQuantity,
        reservedQuantity: state.balance.reservedQuantity,
      } satisfies StockAvailabilitySnapshot;
    },
    async insertReservation(command) {
      const reservation = createReservationRecord({
        createdAt: command.createdAt,
        createdBy: command.createdBy ?? null,
        expiresAt: command.expiresAt,
        id: `res_${state.reservations.length + 1}`,
        locationId: command.locationId,
        quantity: command.quantity,
        skuId: command.skuId,
        sourceKey: command.sourceKey,
        sourceType: command.sourceType,
        updatedAt: command.createdAt,
      });
      state.insertedReservations.push(reservation);
      state.reservations.push(reservation);
      return reservation;
    },
    async markReservationConfirmed(command) {
      const reservation = state.reservations.find(
        (currentReservation) => currentReservation.id === command.reservationId,
      );

      assert.ok(reservation);
      reservation.status = "confirmed";
      reservation.confirmedAt = command.confirmedAt;
      reservation.updatedAt = command.confirmedAt;
      return reservation;
    },
    async markReservationReleased(command) {
      const reservation = state.reservations.find(
        (currentReservation) => currentReservation.id === command.reservationId,
      );

      assert.ok(reservation);
      reservation.status = "released";
      reservation.releasedAt = command.releasedAt;
      reservation.updatedAt = command.releasedAt;
      state.releaseCount += 1;
      return reservation;
    },
    async recordGoodsTransferNote() {
      throw new Error("recordGoodsTransferNote is not used by this harness.");
    },
  };
  const repository: StockReservationLifecycleRepository = {
    async withTransaction(callback) {
      return callback(transaction);
    },
  };

  return {
    service: new StockReservationLifecycleService(repository),
    state,
  };
}

export function createReservationRecord(
  input?: Partial<StockReservationRecord>,
): StockReservationRecord {
  return {
    id: input?.id ?? "res_1",
    cancelledAt: input?.cancelledAt ?? null,
    confirmedAt: input?.confirmedAt ?? null,
    createdAt: input?.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    createdBy: input?.createdBy ?? "usr_manager_1",
    expiresAt: input?.expiresAt ?? new Date("2026-04-08T09:15:00.000Z"),
    locationId: input?.locationId ?? "loc_store_1",
    quantity: input?.quantity ?? 1,
    releasedAt: input?.releasedAt ?? null,
    skuId: input?.skuId ?? "sku_1",
    sourceKey: input?.sourceKey ?? "order_default",
    sourceType: input?.sourceType ?? "ecommerce",
    status: input?.status ?? "active",
    updatedAt: input?.updatedAt ?? new Date("2026-04-08T09:00:00.000Z"),
  };
}

function getActiveReservationQuantity(
  reservations: StockReservationRecord[],
  excludeReservationId?: string,
): number {
  return reservations
    .filter(
      (reservation) =>
        reservation.status === "active" &&
        reservation.id !== excludeReservationId,
    )
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
}
