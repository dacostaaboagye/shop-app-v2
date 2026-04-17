import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  StockReservationExpiryRepository,
  StockReservationExpiryTransaction,
} from "../src/modules/stock/reservation-expiry.contracts.js";
import { ReservationExpiryService } from "../src/modules/stock/reservation-expiry.service.js";
import {
  StockBalanceIntegrityError,
  type StockReservationRecord,
} from "../src/modules/stock/reservation-lifecycle.contracts.js";

describe("ReservationExpiryService", () => {
  it("expires due active reservations and releases reserved stock", async () => {
    const reservation = createReservation({
      expiresAt: new Date("2026-04-08T12:00:00.000Z"),
      id: "res_1",
      quantity: 3,
      status: "active",
    });
    const harness = createHarness({
      reservationIds: ["res_1"],
      reservations: [reservation],
      reservedQuantity: 5,
    });

    const result = await harness.service.expireReservations({
      expiredBefore: new Date("2026-04-08T12:30:00.000Z"),
      now: new Date("2026-04-08T12:31:00.000Z"),
    });

    assert.deepEqual(result.expiredReservationIds, ["res_1"]);
    assert.equal(harness.state.reservedQuantity, 2);
    assert.equal(harness.state.reservations[0]?.status, "expired");
  });

  it("skips reservations that are no longer active when locked", async () => {
    const harness = createHarness({
      reservationIds: ["res_1"],
      reservations: [
        createReservation({
          id: "res_1",
          status: "released",
        }),
      ],
      reservedQuantity: 5,
    });

    const result = await harness.service.expireReservations({
      expiredBefore: new Date("2026-04-08T12:30:00.000Z"),
    });

    assert.deepEqual(result.expiredReservationIds, []);
    assert.equal(harness.state.reservedQuantity, 5);
  });

  it("skips stale selections whose expiry moved forward before locking", async () => {
    const harness = createHarness({
      reservationIds: ["res_1"],
      reservations: [
        createReservation({
          expiresAt: new Date("2026-04-08T13:00:00.000Z"),
          id: "res_1",
          status: "active",
        }),
      ],
      reservedQuantity: 4,
    });

    const result = await harness.service.expireReservations({
      expiredBefore: new Date("2026-04-08T12:30:00.000Z"),
    });

    assert.deepEqual(result.expiredReservationIds, []);
    assert.equal(harness.state.reservedQuantity, 4);
  });

  it("returns an empty result when there are no due reservations", async () => {
    const harness = createHarness();

    const result = await harness.service.expireReservations({
      expiredBefore: new Date("2026-04-08T12:30:00.000Z"),
    });

    assert.deepEqual(result.expiredReservationIds, []);
  });

  it("throws when the balance row is missing during expiry", async () => {
    const harness = createHarness({
      reservationIds: ["res_1"],
      reservations: [
        createReservation({
          id: "res_1",
          quantity: 2,
          status: "active",
        }),
      ],
      reservedQuantity: null,
    });

    await assert.rejects(
      () =>
        harness.service.expireReservations({
          expiredBefore: new Date("2026-04-08T12:30:00.000Z"),
        }),
      (error: unknown) => error instanceof StockBalanceIntegrityError,
    );
  });
});

function createHarness(input?: {
  reservationIds?: string[];
  reservations?: StockReservationRecord[];
  reservedQuantity?: number | null;
}) {
  const state = {
    reservationIds: input?.reservationIds ?? [],
    reservations: [...(input?.reservations ?? [])],
    reservedQuantity:
      input?.reservedQuantity === undefined ? 0 : input.reservedQuantity,
  };
  const transaction: StockReservationExpiryTransaction = {
    async adjustStockBalance(command) {
      if (state.reservedQuantity == null) {
        return false;
      }

      state.reservedQuantity += command.reservedDelta ?? 0;
      return true;
    },
    async getReservationForUpdate(reservationId) {
      return (
        state.reservations.find(
          (reservation) => reservation.id === reservationId,
        ) ?? null
      );
    },
    async markReservationExpired(command) {
      const reservation = state.reservations.find(
        (currentReservation) => currentReservation.id === command.reservationId,
      );

      assert.ok(reservation);
      reservation.status = "expired";
      reservation.updatedAt = command.expiredAt;
      return reservation;
    },
  };
  const repository: StockReservationExpiryRepository = {
    async findExpiredActiveReservationIds() {
      return state.reservationIds;
    },
    async withTransaction(callback) {
      return callback(transaction);
    },
  };

  return {
    service: new ReservationExpiryService(repository),
    state,
  };
}

function createReservation(
  input?: Partial<StockReservationRecord>,
): StockReservationRecord {
  return {
    id: input?.id ?? "res_1",
    cancelledAt: input?.cancelledAt ?? null,
    confirmedAt: input?.confirmedAt ?? null,
    createdAt: input?.createdAt ?? new Date("2026-04-08T09:00:00.000Z"),
    createdBy: input?.createdBy ?? "usr_manager_1",
    expiresAt: input?.expiresAt ?? new Date("2026-04-08T12:00:00.000Z"),
    locationId: input?.locationId ?? "loc_store_1",
    quantity: input?.quantity ?? 1,
    releasedAt: input?.releasedAt ?? null,
    skuId: input?.skuId ?? "sku_1",
    sourceKey: input?.sourceKey ?? "order_123",
    sourceType: input?.sourceType ?? "ecommerce",
    status: input?.status ?? "active",
    updatedAt: input?.updatedAt ?? new Date("2026-04-08T09:00:00.000Z"),
  };
}
